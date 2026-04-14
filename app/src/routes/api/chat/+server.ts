import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { routeQuestionSemantic, resolveScope, filterMatchesByScope } from '$lib/server/semantic-router';
import { loadChapters, formatContext } from '$lib/server/chapters';
import { streamCompletion } from '$lib/server/ai';
import { incrementAnonymousCount, recordUserQuestion } from '$lib/server/queries';
import { parseSSE } from '$lib/sse-parser';

const VALID_REGULATIONS = new Set([
  'auto', 'K2', 'K3', 'K2K3', 'Bokföring', 'Fusioner', 'BRF',
  'Årsbokslut', 'Gränsvärden', 'K1 Enskilda', 'K1 Ideella',
]);

export const POST: RequestHandler = async ({ request, locals }) => {
  const { message, history = [], regulation = 'auto' } = await request.json();

  if (typeof message !== 'string' || message.length === 0 || message.length > 10000) {
    return json({ error: 'invalid_message' }, { status: 400 });
  }
  if (!Array.isArray(history) || history.length > 20) {
    return json({ error: 'invalid_history' }, { status: 400 });
  }
  for (const m of history) {
    if (!m || typeof m !== 'object') return json({ error: 'invalid_history_entry' }, { status: 400 });
    if (m.role !== 'user' && m.role !== 'assistant') return json({ error: 'invalid_role' }, { status: 400 });
    if (typeof m.content !== 'string' || m.content.length > 10000) return json({ error: 'invalid_content' }, { status: 400 });
  }
  if (typeof regulation !== 'string' || !VALID_REGULATIONS.has(regulation)) {
    return json({ error: 'invalid_regulation' }, { status: 400 });
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
  const upstreamBody = await streamCompletion(context, messages, regulation);

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
      const encoder = new TextEncoder();

      try {
        for await (const data of parseSSE(reader)) {
          if (data === '[DONE]') {
            controller.enqueue(
              encoder.encode(
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
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }
          } catch {
            // Skip unparseable chunks
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
