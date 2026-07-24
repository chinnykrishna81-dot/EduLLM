import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://I039196@localhost:5432/edullm',
  max: 5,
  idleTimeoutMillis: 10_000
});

export async function query<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  return pool.query<T & import('pg').QueryResultRow>(text, values);
}
