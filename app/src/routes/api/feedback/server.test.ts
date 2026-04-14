import { describe, it, expect, vi, beforeEach } from 'vitest';

const executeMock = vi.fn().mockResolvedValue({ rows: [] });

vi.mock('$lib/server/db', () => ({
  getDb: () => ({ execute: executeMock }),
}));

import { POST } from './+server';

function mockEvent(body: unknown): Parameters<typeof POST>[0] {
  return {
    request: new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: {},
  } as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    executeMock.mockClear();
    executeMock.mockResolvedValue({ rows: [] });
  });

  it('returns 200 on successful feedback insert', async () => {
    const res = await POST(
      mockEvent({
        vote: 'up',
        feedback: 'bra svar',
        question: 'Hur bokför jag?',
        answer: 'Svar här',
        sources: ['K2 Kap 2'],
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("returns 200 even when fields missing (defaults to 'up')", async () => {
    const res = await POST(mockEvent({}));
    expect(res.status).toBe(200);
    expect(executeMock).toHaveBeenCalledTimes(1);
    const call = executeMock.mock.calls[0][0] as { args: unknown[] };
    expect(call.args[0]).toBe('up');
  });

  it('inserts correct data into mocked db', async () => {
    await POST(
      mockEvent({
        vote: 'down',
        feedback: 'fel',
        question: 'q',
        answer: 'a',
        sources: ['S1', 'S2'],
      })
    );
    expect(executeMock).toHaveBeenCalledTimes(1);
    const call = executeMock.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(call.sql).toContain('INSERT INTO feedback');
    expect(call.args[0]).toBe('down');
    expect(call.args[1]).toBe('fel');
    expect(call.args[2]).toBe('q');
    expect(call.args[3]).toBe('a');
    expect(call.args[4]).toBe(JSON.stringify(['S1', 'S2']));
  });

  it('returns 200 even when db throws', async () => {
    executeMock.mockRejectedValueOnce(new Error('db down'));
    const res = await POST(mockEvent({ vote: 'up' }));
    expect(res.status).toBe(200);
  });
});
