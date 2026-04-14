/**
 * Seed chapter_embeddings table in Turso from data/embeddings.json.
 *
 * Usage: npm run seed:embeddings
 *
 * Requires env vars:
 *   TURSO_DATABASE_URL
 *   TURSO_AUTH_TOKEN
 *
 * Creates the table if it does not exist, then inserts all rows.
 * Existing rows are cleared first so the seed is idempotent.
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface StoredEmbedding {
  regulation: string;
  dir: string;
  file: string;
  section: string;
  label: string;
  text: string;
  embedding: number[];
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS chapter_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  regulation TEXT NOT NULL,
  dir TEXT NOT NULL,
  file TEXT NOT NULL,
  section TEXT NOT NULL,
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  embedding TEXT NOT NULL
);
`;

const INDEX = `CREATE INDEX IF NOT EXISTS idx_chapter_embeddings_regulation ON chapter_embeddings(regulation);`;

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }

  const db = createClient({ url, authToken });

  console.log('Ensuring schema...');
  await db.execute(SCHEMA);
  await db.execute(INDEX);

  const jsonPath = resolve(__dirname, '../data/embeddings.json');
  console.log(`Reading embeddings from ${jsonPath}...`);
  const raw = readFileSync(jsonPath, 'utf-8');
  const rows = JSON.parse(raw) as StoredEmbedding[];
  console.log(`Loaded ${rows.length} embeddings.`);

  console.log('Clearing existing rows...');
  await db.execute('DELETE FROM chapter_embeddings');

  console.log('Inserting rows in batches...');
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.batch(
      batch.map((r) => ({
        sql:
          'INSERT INTO chapter_embeddings (regulation, dir, file, section, label, text, embedding) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [
          r.regulation,
          r.dir,
          r.file,
          r.section,
          r.label,
          r.text,
          JSON.stringify(r.embedding),
        ],
      })),
      'write',
    );
    inserted += batch.length;
    if (inserted % 500 === 0 || inserted === rows.length) {
      console.log(`  ${inserted}/${rows.length}`);
    }
  }

  console.log(`Seeded ${inserted} chapter_embeddings rows.`);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
