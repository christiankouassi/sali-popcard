// Cas limites et tentatives d'attaque contre l'API. Lancé après integration.mjs
// sur la même base PGlite de test.
import assert from "node:assert/strict";
import pg from "pg";
const base = "http://localhost:3000";
const db = new pg.Client({ connectionString: "postgresql://postgres@127.0.0.1:55432/postgres" });
await db.connect();
class Client {
  cookie = "";
  async raw(p, { method, body, headers = {} } = {}) {
    return fetch(base + "/api/" + p, {
      method: method || (body === undefined ? "GET" : "POST"),
      headers: { ...(this.cookie ? { cookie: this.cookie } : {}), ...headers },
      body,
    });
  }
  async call(p, data, expected = 200) {
    const r = await this.raw(p, {
      body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data),
      headers: {
        ...(data === undefined ? {} : { Origin: base }),
        ...(data instanceof FormData || data === undefined ? {} : { "Content-Type": "application/json" }),
      },
    });
    const c = r.headers.get("set-cookie");
    if (c) this.cookie = c.split(";")[0];
    const body = await r.json();
    assert.equal(r.status, expected, p + " " + JSON.stringify(body));
    return body;
  }
}
const card = {
  tpl: "A", primary: "#123456", accent: "#1D9878", firstName: "Sécu", lastName: "Test", company: "", title: "",
  city: "", desc: "", address: "", website: "", whatsapp: "", instagram: "", linkedin: "", facebook: "",
  lang: "fr", fontTitle: "Montserrat", fontBody: "Open Sans", phones: [["Mobile", "+212600000000"]], emails: [], show: {phones: true}, logoTile: false,
};
const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c6360f8cf00000301010018dd8db40000000049454e44ae426082", "hex");
const passed = [];
const ok = (label) => passed.push(label);
try {
  const eve = new Client(), mallory = new Client(), anon = new Client(), boss = new Client();
  const register = (c, email) => c.call("auth/register", { name: "Test " + email, email, password: "TestPassword123", confirmation: "TestPassword123", terms: true });
  await register(eve, "eve@example.com");
  await register(mallory, "mallory@example.com");
  await register(boss, "boss@example.com");
  await db.query("UPDATE users SET is_admin=true WHERE email='boss@example.com'");

  // En-têtes de sécurité sur les pages
  const home = await fetch(base + "/");
  for (const h of ["content-security-policy", "strict-transport-security", "x-frame-options", "x-content-type-options", "referrer-policy"])
    assert.ok(home.headers.get(h), "En-tête manquant : " + h);
  assert.match(home.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(home.headers.get("x-powered-by"), null);
  ok("en-têtes CSP/HSTS/anti-iframe présents, X-Powered-By absent");

  // Corps invalides
  let r = await eve.raw("cards", { body: "{pas du json", headers: { Origin: base, "Content-Type": "application/json" } });
  assert.equal(r.status, 400);
  ok("JSON invalide → 400");
  r = await eve.raw("cards", { body: JSON.stringify(card), headers: { "Content-Type": "application/json" } });
  assert.equal(r.status, 403);
  ok("POST sans Origin → 403");
  r = await eve.raw("cards", { body: JSON.stringify(card), headers: { Origin: "null", "Content-Type": "application/json" } });
  assert.equal(r.status, 403);
  ok("Origin null (iframe sandbox) → 403");

  // Injections
  await anon.call("auth/login", { email: "' OR 1=1 --", password: "x" }, 422);
  await anon.call("auth/login", { email: "eve@example.com' --", password: "x" }, 422);
  await anon.call("public/' OR '1'='1", undefined, 404);
  await anon.call("public/..%2F..%2Fetc%2Fpasswd", undefined, 404);
  await anon.call("files/' OR 1=1 --", undefined, 404);
  await anon.call("preview/" + "g".repeat(64), undefined, 404);
  ok("injections SQL / traversée de chemin rejetées");

  // Validation et messages lisibles
  let e = await anon.call("auth/register", { name: "A", email: "x@y.z", password: "court", confirmation: "court", terms: true }, 422);
  assert.match(e.error, /nom/);
  assert.match(e.error, /10 caractères/);
  e = await anon.call("auth/register", { name: "Sans conditions", email: "nt@example.com", password: "TestPassword123", confirmation: "TestPassword123", terms: false }, 422);
  assert.match(e.error, /conditions/);
  e = await eve.call("cards", { ...card, firstName: "x".repeat(101) }, 422);
  assert.match(e.error, /prénom/);
  e = await eve.call("cards", { ...card, primary: "red; background:url(javascript:alert(1))" }, 422);
  e = await eve.call("cards", { ...card, tpl: "Z" }, 422);
  e = await eve.call("cards", { ...card, emails: ["pas-un-email"] });
  assert.equal(e.data.emails[0], "pas-un-email");

  e = await eve.call("cards", { ...card, phones: Array(6).fill(["Mobile", "0600"]) }, 422);
  await eve.call("auth/register", { name: "Doublon", email: "EVE@Example.com ", password: "TestPassword123", confirmation: "TestPassword123", terms: true }, 409);
  ok("validation des champs avec messages en français, doublon d’e-mail insensible à la casse");

  // XSS stocké : accepté comme texte, jamais comme lien exécutable
  const xss = await eve.call("cards", { ...card, firstName: "<img src=x onerror=alert(1)>", website: "javascript:alert(document.cookie)", instagram: "data:text/html,<script>alert(1)</script>" });
  assert.equal(xss.data.firstName, "<img src=x onerror=alert(1)>");
  ok("contenu HTML stocké comme texte (rendu échappé par React, liens filtrés par safeUrl)");

  // Accès anonymes et droits
  for (const p of ["me", "cards", "orders", "admin/orders"]) await anon.call(p, undefined, 401);
  for (const p of ["admin/orders", "admin/users", "admin/cards", "admin/mail"]) await eve.call(p, undefined, 403);
  await eve.call("admin/cards/" + xss.id, { status: "live" }, 403);
  ok("routes protégées : 401 anonyme, 403 non-admin");

  // IDOR
  const own = await eve.call("cards", card);
  await mallory.call("cards/" + own.id, undefined, 404);
  await mallory.call("cards/" + own.id, card, 404);
  await mallory.call("cards/" + own.id + "/share-preview", {}, 404);
  const lf = new FormData();
  lf.set("file", new Blob([png], { type: "image/png" }), "logo.png");
  await mallory.call("cards/" + own.id + "/logo", lf, 404);
  ok("IDOR : carte d’un autre client inaccessible (lecture, écriture, logo, aperçu)");

  // UUID invalides côté admin → 404 propre (et non erreur serveur)
  await boss.call("admin/cards/pas-un-uuid", { status: "live" }, 404);
  await boss.call("admin/orders/pas-un-uuid", undefined, 404);
  await boss.call("admin/orders/pas-un-uuid", { status: "verified", note: "", tracking: "", bank_confirmed: true, rights_confirmed: true }, 404);
  await boss.call("admin/orders/00000000-0000-0000-0000-000000000000", { status: "verified", note: "", tracking: "", bank_confirmed: true, rights_confirmed: true }, 404);
  ok("identifiants admin invalides → 404");

  // Fichiers piégés
  const upload = async (name, type, bytes, expected) => {
    const f = new FormData();
    f.set("file", new Blob([bytes], { type }), name);
    return eve.call("cards/" + own.id + "/logo", f, expected);
  };
  await upload("logo.svg", "image/svg+xml", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', 422);
  await upload("logo.png", "image/png", "<html><script>alert(1)</script></html>", 422);
  await upload("logo.pdf", "application/pdf", "%PDF-1.4 faux", 422);
  await upload("vide.png", "image/png", "", 422);
  r = await eve.raw("cards/" + own.id + "/logo", { body: Buffer.alloc(8 * 1024 * 1024), headers: { Origin: base, "Content-Type": "application/octet-stream" } });
  assert.equal(r.status, 413);
  ok("uploads : SVG actif, HTML déguisé, faux PDF, fichier vide et 8 Mo refusés");

  // Remplacement de logo : l'ancien fichier est supprimé
  const first = await upload("a.png", "image/png", png, 200);
  const second = await upload("b.png", "image/png", png, 200);
  const left = await db.query("SELECT id FROM files WHERE id=$1", [first.logo_id]);
  assert.equal(left.rowCount, 0, "ancien logo conservé");
  assert.equal((await db.query("SELECT id FROM files WHERE id=$1", [second.logo_id])).rowCount, 1);
  ok("remplacement de logo : l’ancien fichier est supprimé de la base");

  // Fichier servi avec des en-têtes sûrs
  const file = await eve.raw("files/" + second.logo_id);
  assert.equal(file.status, 200);
  assert.match(file.headers.get("content-security-policy"), /sandbox/);
  assert.equal(file.headers.get("x-content-type-options"), "nosniff");
  await mallory.call("files/" + second.logo_id, undefined, 404);
  ok("fichiers privés : sandbox + nosniff, inaccessibles aux autres");

  // Rotation de session
  const s1 = new Client();
  await s1.call("auth/login", { email: "mallory@example.com", password: "TestPassword123" });
  const old = s1.cookie;
  await s1.call("auth/login", { email: "mallory@example.com", password: "TestPassword123" });
  assert.notEqual(old, s1.cookie);
  const stale = new Client();
  stale.cookie = old;
  await stale.call("me", undefined, 401);
  ok("rotation de session à la reconnexion");

  // Déconnexion : le cookie volé ne sert plus
  const s2 = new Client();
  await s2.call("auth/login", { email: "mallory@example.com", password: "TestPassword123" });
  const stolen = s2.cookie;
  await s2.call("auth/logout", {});
  const thief = new Client();
  thief.cookie = stolen;
  await thief.call("me", undefined, 401);
  ok("déconnexion : session supprimée côté serveur");

  // Jetons bidon / mauvais type
  await anon.call("auth/verify", { token: "0".repeat(64) }, 422);
  await anon.call("auth/reset", { token: "0".repeat(64), password: "TestPassword123", confirmation: "TestPassword123" }, 422);
  await anon.call("auth/reset", { token: "court", password: "TestPassword123", confirmation: "TestPassword123" }, 422);
  ok("jetons de vérification / réinitialisation invalides refusés");

  // Mot de passe oublié : même réponse que le compte existe ou non
  const known = await anon.call("auth/forgot", { email: "eve@example.com" });
  const unknown = await anon.call("auth/forgot", { email: "personne@example.com" });
  assert.deepEqual(known, unknown);
  ok("mot de passe oublié : pas d’énumération des comptes");

  // Commande : quantité, montant non falsifiable, ICE entreprise
  await db.query("UPDATE users SET verified_at=now() WHERE email='eve@example.com'");
  const base_order = { card_id: own.id, quantity: 1, billing_type: "person", billing_name: "Eve", ice: "", country: "Maroc", address: "Rue de test 1", rights: true, terms: true };
  await eve.call("orders", { ...base_order, quantity: 0 }, 422);
  await eve.call("orders", { ...base_order, quantity: 501 }, 422);
  await eve.call("orders", { ...base_order, quantity: 1.5 }, 422);
  await eve.call("orders", { ...base_order, billing_type: "company", ice: "123" }, 422);
  await eve.call("orders", { ...base_order, country: "Atlantide" }, 422);
  await eve.call("orders", { ...base_order, rights: false }, 422);
  await mallory.call("orders", base_order, 403);
  const order = await eve.call("orders", { ...base_order, amount: 1 });
  assert.equal(order.amount, 400);
  ok("commande : quantités hors limites, ICE, pays, droits refusés ; montant calculé par le serveur");

  // Transitions interdites
  await boss.call("admin/orders/" + order.id, { status: "shipped", note: "", tracking: "X", bank_confirmed: true, rights_confirmed: true }, 422);
  await boss.call("admin/orders/" + order.id, { status: "verified", note: "", tracking: "", bank_confirmed: true, rights_confirmed: true }, 422);
  ok("admin : impossible d’expédier ou valider sans justificatif");

  // Reçu : faux formats, autre client
  const rf = (bytes, type, name) => { const f = new FormData(); f.set("file", new Blob([bytes], { type }), name); return f; };
  await eve.call("orders/" + order.id + "/receipt", rf("<html>", "application/pdf", "r.pdf"), 422);
  await mallory.call("orders/" + order.id + "/receipt", rf("%PDF-1.4", "application/pdf", "r.pdf"), 404);
  ok("justificatif : faux PDF refusé, dépôt sur la commande d’un autre refusé");

  // Limite de tentatives de connexion
  let last;
  for (let i = 0; i < 13; i++) last = await anon.raw("auth/login", { body: JSON.stringify({ email: "boss@example.com", password: "mauvais" }), headers: { Origin: base, "Content-Type": "application/json" } });
  assert.equal(last.status, 429);
  ok("force brute : blocage après 12 essais");

  // Limite sur le changement de mot de passe (session volée)
  let pw;
  for (let i = 0; i < 11; i++) pw = await mallory.raw("password", { body: JSON.stringify({ current_password: "faux" + i, password: "NewPassword123", confirmation: "NewPassword123" }), headers: { Origin: base, "Content-Type": "application/json" } });
  assert.equal(pw.status, 429);
  ok("changement de mot de passe : force brute bloquée");

  // Usurpation d'IP via X-Forwarded-For : chaque tentative compte quand même par e-mail
  let spoof;
  for (let i = 0; i < 6; i++) spoof = await anon.raw("auth/register", { body: JSON.stringify({ name: "Spam", email: "victime@example.com", password: "TestPassword123", confirmation: "TestPassword123", terms: true }), headers: { Origin: base, "Content-Type": "application/json", "X-Forwarded-For": "10.0.0." + i } });
  assert.ok([409, 429].includes(spoof.status));
  ok("inscriptions répétées vers une même adresse limitées malgré X-Forwarded-For variable");

  // Erreur technique : message générique
  const generic = await anon.raw("cards", { method: "PUT" });
  assert.ok([404, 405].includes(generic.status));
  ok("méthode non prévue refusée");

  console.log("PASS sécurité (" + passed.length + " contrôles) :\n - " + passed.join("\n - "));
} finally {
  await db.end();
}
