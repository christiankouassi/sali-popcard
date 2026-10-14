import pg from "pg";
const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw Error("Usage : npm run admin -- email@example.com");
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  const r = await c.query(
    "UPDATE users SET is_admin=true WHERE email=$1 RETURNING email",
    [email],
  );
  if (!r.rowCount) throw Error("Inscrivez ce compte avant de le promouvoir.");
  console.log("Administrateur :", r.rows[0].email);
} finally {
  await c.end();
}
