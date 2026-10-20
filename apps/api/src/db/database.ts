import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load the API environment before constructing the pool. main.ts also loads
// these values, but static imports create this pool first during `npm start`.
for (const envPath of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env'), resolve(process.cwd(), 'apps/api/.env')]) {
  try {
    const env = readFileSync(envPath, 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://I039196@localhost:5432/edullm',
  max: 5,
  idleTimeoutMillis: 10_000
});

export async function query<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  return pool.query<T & import('pg').QueryResultRow>(text, values);
}
