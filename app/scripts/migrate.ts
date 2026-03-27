/**
 * Run database migrations against Turso.
 * Usage: npx tsx scripts/migrate.ts
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = createClient({
  url: 'libsql://bfn-advisor-bratland.aws-eu-west-1.turso.io',
  authToken:
    'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQ1NzE4ODYsImlkIjoiMDE5ZDJjYjktZTgwMS03YjZjLThmMDUtNjM1ZWRjZjI1ZTkzIiwicmlkIjoiYzgzMmI0MTEtZTUyNS00Njg3LWIwNTEtOWUxMGE2MWNiNzljIn0.1U_OrZY6wGpnQy4EmtGIfHClNqeqDgzItoQXqqF4XWm15VRNhXVlLHCLGfjeTdVv_uQUUaaH_qn2dyN9a47XAg',
});

async function main() {
  const schemaPath = resolve(__dirname, '../src/lib/server/schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Split on semicolons, strip comments, and filter out empty statements
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.replace(/--.*$/gm, '').trim().length > 0);

  console.log(`Running ${statements.length} migration statements...`);

  for (const statement of statements) {
    const preview = statement.replace(/\s+/g, ' ').slice(0, 80);
    console.log(`  -> ${preview}...`);
    await db.execute(statement);
  }

  console.log('Migration completed successfully.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
