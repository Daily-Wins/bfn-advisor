/**
 * Create the rate_limit_log table and supporting index in Turso.
 * Usage: npx tsx scripts/migrate-rate-limit.ts
 */

import { createClient } from '@libsql/client';
import 'dotenv/config';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('Missing TURSO_DATABASE_URL env var');
  process.exit(1);
}

const db = createClient({ url, authToken });

await db.execute(`CREATE TABLE IF NOT EXISTS rate_limit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
await db.execute(
  'CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time ON rate_limit_log(key, created_at)'
);

console.log('rate_limit_log table ready');
