import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  const { vote, feedback, question, answer, sources } = await request.json();

  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO feedback (vote, feedback_text, question, answer, sources) VALUES (?, ?, ?, ?, ?)`,
      args: [
        vote || 'up',
        feedback || '',
        question || '',
        (answer || '').slice(0, 5000),
        JSON.stringify(sources || []),
      ],
    });
  } catch (err) {
    console.error('[FEEDBACK ERROR]', err);
  }

  return json({ ok: true });
};
