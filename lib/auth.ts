import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { query } from "./db";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function currentUser() {
  const token = (await cookies()).get("popcard_session")?.value;
  if (!token) return null;
  const r = await query(
    "SELECT u.id,u.email,u.name,u.is_admin,u.verified_at,u.profile FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
    [hash(token)],
  );
  return r.rows[0] ?? null;
}
export async function session(userId: string) {
  const token = randomBytes(32).toString("hex");
  await query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
    [hash(token), userId],
  );
  (await cookies()).set("popcard_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 604800,
  });
}
export async function logout() {
  const c = await cookies();
  const t = c.get("popcard_session")?.value;
  if (t) await query("DELETE FROM sessions WHERE token_hash=$1", [hash(t)]);
  c.delete("popcard_session");
}
export async function token(userId: string, kind: string) {
  const t = randomBytes(32).toString("hex");
  await query("DELETE FROM tokens WHERE user_id=$1 AND kind=$2", [
    userId,
    kind,
  ]);
  await query(
    "INSERT INTO tokens(token_hash,user_id,kind,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",
    [hash(t), userId, kind],
  );
  return t;
}
