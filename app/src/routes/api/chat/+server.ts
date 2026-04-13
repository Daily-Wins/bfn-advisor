import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { routeQuestionSemantic } from '$lib/server/semantic-router';
import type { ChapterMatch } from '$lib/server/semantic-router';
import { loadChapters, formatContext } from '$lib/server/chapters';
import { streamCompletion } from '$lib/server/ai';
import { incrementAnonymousCount, recordUserQuestion } from '$lib/server/queries';

export type RegulationScope =
  | { type: 'single'; regulation: string }
  | { type: 'comparison'; regulations: string[] }
  | { type: 'auto' };

const VALID_REGULATIONS = new Set([
  'K2', 'K3', 'Bokföring', 'Fusioner', 'BRF', 'Årsbokslut',
  'Gränsvärden', 'K1 Enskilda', 'K1 Ideella',
]);

export function resolveScope(regulation: string): RegulationScope {
  if (regulation === 'K2K3') return { type: 'comparison', regulations: ['K2', 'K3'] };
  if (VALID_REGULATIONS.has(regulation)) return { type: 'single', regulation };
  return { type: 'auto' };
}

export function filterMatchesByScope(matches: ChapterMatch[], scope: RegulationScope): ChapterMatch[] {
  if (scope.type === 'auto') return matches;
  if (scope.type === 'single') {
    const filtered = matches.filter(m => m.regulation === scope.regulation);
    return filtered.length > 0 ? filtered : matches;
  }
  if (scope.type === 'comparison') {
    const filtered = matches.filter(m => scope.regulations.includes(m.regulation));
    return filtered.length > 0 ? filtered : matches;
  }
  return matches;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { message, history = [], regulation = 'auto' } = await request.json();

  if (!message || typeof message !== 'string') {
    return json({ error: 'Message required' }, { status: 400 });
  }

  if (!locals.user && locals.questionCount >= 5) {
    return json(
      { error: 'limit_reached', message: 'Skapa ett konto för att fortsätta ställa frågor.' },
      { status: 403 }
    );
  }

  // Build routing query from message + recent context for follow-up questions
  const lastUserMessages = history
    .filter((m: { role: string }) => m.role === 'user')
    .slice(-2)
    .map((m: { content: string }) => m.content);
  const routingQuery = [...lastUserMessages, message].join(' ');

  const scope = resolveScope(regulation);

  // Route question to relevant chapters (semantic via Jina embeddings)
  const allMatches = await routeQuestionSemantic(routingQuery);
  const matches = filterMatchesByScope(allMatches, scope);

  // Load chapter content
  const chapters = await loadChapters(matches);
  const context = formatContext(chapters, matches);

  // Build message history
  const messages = [
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  // Stream AI response
  const upstreamBody = await streamCompletion(context, messages);

  // Track usage statistics
  if (!locals.user) {
    await incrementAnonymousCount(locals.anonymousSessionId);
  } else {
    await recordUserQuestion(locals.user.id, message, matches.map((m) => m.label));
  }

  // Parse SSE from OpenRouter and forward as our own SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ done: true, sources: matches.map((m) => m.label) })}\n\n`
                )
              );
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
