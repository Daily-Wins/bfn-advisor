import { createClient, type Client } from '@libsql/client';
import { env } from '$env/dynamic/private';

let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: env.TURSO_DATABASE_URL || '',
      authToken: env.TURSO_AUTH_TOKEN || '',
    });
  }
  return _db;
}
