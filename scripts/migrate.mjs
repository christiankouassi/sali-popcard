import pg from "pg";
import { readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL) throw Error("DATABASE_URL manquante");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(79264511)");
  await client.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  await client.query("COMMIT");
  console.log("Tables PostgreSQL prêtes.");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  await client.end();
}
