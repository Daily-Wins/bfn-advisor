import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { checkRateLimit } from '$lib/server/rate-limit';

const VALID_VOTES = new Set(['up', 'down']);

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const ip = getClientAddress();
  const allowed = await checkRateLimit(`feedback:${ip}`, 10);
  if (!allowed) {
    return json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const { vote, feedback, question, answer, sources } = body ?? {};

  if (!VALID_VOTES.has(vote)) {
    return json({ error: 'invalid_vote' }, { status: 400 });
  }

  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO feedback (vote, feedback_text, question, answer, sources) VALUES (?, ?, ?, ?, ?)`,
      args: [
        vote,
        typeof feedback === 'string' ? feedback.slice(0, 2000) : '',
        typeof question === 'string' ? question.slice(0, 2000) : '',
        typeof answer === 'string' ? answer.slice(0, 5000) : '',
        JSON.stringify(Array.isArray(sources) ? sources.slice(0, 20) : []),
      ],
    });
  } catch (err) {
    console.error('[FEEDBACK ERROR]', err);
  }

  return json({ ok: true });
};
