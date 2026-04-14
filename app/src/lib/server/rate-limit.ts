import { getDb } from './db';

const DDL = `CREATE TABLE IF NOT EXISTS rate_limit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time ON rate_limit_log(key, created_at);`;

let initialized = false;

async function ensureTable(): Promise<void> {
  if (initialized) return;
  const db = getDb();
  const statements = DDL.split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await db.execute(stmt);
  }
  initialized = true;
}

/**
 * Returns true if the request is allowed, false if it should be rate-limited.
 * Uses a sliding 1-minute window per key.
 */
export async function checkRateLimit(key: string, maxPerMinute: number): Promise<boolean> {
  await ensureTable();
  const db = getDb();

  const result = await db.execute({
    sql: "SELECT COUNT(*) as n FROM rate_limit_log WHERE key = ? AND created_at > datetime('now', '-1 minute')",
    args: [key],
  });
  const count = Number(result.rows[0]['n'] ?? 0);
  if (count >= maxPerMinute) return false;

  await db.execute({
    sql: 'INSERT INTO rate_limit_log (key) VALUES (?)',
    args: [key],
  });

  // Opportunistic cleanup: delete rows older than 1 hour
  await db.execute("DELETE FROM rate_limit_log WHERE created_at < datetime('now', '-1 hour')");

  return true;
}
