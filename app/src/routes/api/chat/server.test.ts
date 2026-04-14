import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
  OPENROUTER_API_KEY: 'test-key',
}));

vi.mock('$lib/server/semantic-router', () => ({
  routeQuestionSemantic: vi.fn().mockResolvedValue([
    {
      regulation: 'K2',
      dir: 'k2-arsredovisning',
      file: '02-redovisningsprinciper.md',
      label: 'K2 Kap 2',
      score: 1,
    },
  ]),
  resolveScope: vi.fn().mockReturnValue({ type: 'single', regulation: 'K2' }),
  filterMatchesByScope: (matches: unknown[]) => matches,
}));

vi.mock('$lib/server/chapters', () => ({
  loadChapters: vi
    .fn()
    .mockResolvedValue([{ regulation: 'K2', label: 'Test', content: 'Test content' }]),
  formatContext: () => 'Test context',
}));

vi.mock('$lib/server/ai', () => ({
  streamCompletion: vi.fn().mockResolvedValue(
    new ReadableStream({
      start(c) {
        c.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"hej"}}]}\n\n'
          )
        );
        c.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        c.close();
      },
    })
  ),
}));

const incrementAnonymousCount = vi.fn().mockResolvedValue(undefined);
const recordUserQuestion = vi.fn().mockResolvedValue(undefined);
vi.mock('$lib/server/queries', () => ({
  incrementAnonymousCount: (...args: unknown[]) => incrementAnonymousCount(...args),
  recordUserQuestion: (...args: unknown[]) => recordUserQuestion(...args),
  getOrCreateAnonymousSession: vi
    .fn()
    .mockResolvedValue({ id: 'anon-1', questionCount: 0 }),
}));

import { POST } from './+server';

function mockEvent(body: unknown, locals: Record<string, unknown> = {}): Parameters<typeof POST>[0] {
  return {
    request: new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: {
      user: null,
      anonymousSessionId: 'anon-1',
      questionCount: 0,
      ...locals,
    },
  } as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    incrementAnonymousCount.mockClear();
    recordUserQuestion.mockClear();
  });

  it('returns 400 when message missing', async () => {
    const res = await POST(mockEvent({ history: [], regulation: 'K2' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    // Accept either current or refactored error code
    expect(body.error).toMatch(/message/i);
  });

  it('returns 400 when message is not a string', async () => {
    const res = await POST(mockEvent({ message: 123, history: [], regulation: 'K2' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when message is empty string', async () => {
    const res = await POST(mockEvent({ message: '', history: [], regulation: 'K2' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when anonymous user has 5+ questions', async () => {
    const res = await POST(
      mockEvent(
        { message: 'test', history: [], regulation: 'K2' },
        { user: null, questionCount: 5 }
      )
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('limit_reached');
  });

  it('returns 200 with SSE response when valid payload', async () => {
    const res = await POST(mockEvent({ message: 'test', history: [], regulation: 'K2' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    const text = await res.text();
    expect(text).toContain('hej');
  });

  it('increments anonymous count after successful chat', async () => {
    const res = await POST(mockEvent({ message: 'test', history: [], regulation: 'K2' }));
    expect(res.status).toBe(200);
    expect(incrementAnonymousCount).toHaveBeenCalledWith('anon-1');
    expect(recordUserQuestion).not.toHaveBeenCalled();
  });

  it("records authenticated user's question", async () => {
    const res = await POST(
      mockEvent(
        { message: 'test question', history: [], regulation: 'K2' },
        { user: { id: 'user-123', email: 'a@b.com' } }
      )
    );
    expect(res.status).toBe(200);
    expect(recordUserQuestion).toHaveBeenCalledWith(
      'user-123',
      'test question',
      expect.any(Array)
    );
    expect(incrementAnonymousCount).not.toHaveBeenCalled();
  });
});
