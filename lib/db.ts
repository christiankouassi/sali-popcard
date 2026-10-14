import { Pool, PoolClient } from "pg";
const globalPg = globalThis as unknown as { popcardPool?: Pool };
export function pool() {
  if (!process.env.DATABASE_URL)
    throw new Error("La base PostgreSQL doit être configurée.");
  return (globalPg.popcardPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  }));
}
export async function query(sql: string, values: unknown[] = []) {
  return pool().query(sql, values);
}
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
