import { getDb } from '$lib/server/db';

export async function getOrCreateAnonymousSession(
  id: string
): Promise<{ id: string; questionCount: number }> {
  const db = getDb();

  const result = await db.execute({
    sql: 'SELECT id, question_count FROM anonymous_sessions WHERE id = ?',
    args: [id],
  });

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      id: row['id'] as string,
      questionCount: row['question_count'] as number,
    };
  }

  await db.execute({
    sql: 'INSERT INTO anonymous_sessions (id, question_count, created_at, last_active_at) VALUES (?, 0, datetime(\'now\'), datetime(\'now\'))',
    args: [id],
  });

  return { id, questionCount: 0 };
}

export async function incrementAnonymousCount(id: string): Promise<void> {
  const db = getDb();

  await db.execute({
    sql: 'UPDATE anonymous_sessions SET question_count = question_count + 1, last_active_at = datetime(\'now\') WHERE id = ?',
    args: [id],
  });
}

export async function recordUserQuestion(
  userId: string,
  question: string,
  sources: string[]
): Promise<void> {
  const db = getDb();

  await db.execute({
    sql: 'INSERT INTO user_statistics (user_id, question, sources, created_at) VALUES (?, ?, ?, datetime(\'now\'))',
    args: [userId, question, JSON.stringify(sources)],
  });
}
