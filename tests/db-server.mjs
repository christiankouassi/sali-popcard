// PostgreSQL compilé en WebAssembly, uniquement pour les tests locaux automatisés.
import { PGlite } from "@electric-sql/pglite";
import { createServer } from "pglite-server";
import { readFile } from "node:fs/promises";
const db = new PGlite();
await db.waitReady;
await db.exec(
  await readFile(new URL("../scripts/schema.sql", import.meta.url), "utf8"),
);
const server = createServer(db);
server.listen(55432, "127.0.0.1", () =>
  console.log("PostgreSQL test prêt : 55432"),
);
process.on("SIGTERM", () => server.close(() => process.exit()));
