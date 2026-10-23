import assert from "node:assert/strict";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { fontCatalog } from "../lib/font-catalog.mjs";
const base = "http://localhost:3000";
const db = new pg.Client({
  connectionString: "postgresql://postgres@127.0.0.1:55432/postgres",
});
await db.connect();
let checks = 0;
const pass = (label) => {
  checks++;
  console.log("PASS " + label);
};
class Client {
  cookie = "";
  async request(path, data, expected = 200, extra = {}) {
    const response = await fetch(base + "/api/" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        ...(data === undefined ? {} : { Origin: base }),
        ...(data instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(this.cookie ? { cookie: this.cookie } : {}),
        ...extra,
      },
      body:
        data === undefined
          ? undefined
          : data instanceof FormData
            ? data
            : JSON.stringify(data),
    });
    const cookie = response.headers.get("set-cookie");
    if (cookie) this.cookie = cookie.split(";")[0];
    const body = response.headers.get("content-type")?.includes("json")
      ? await response.json()
      : new Uint8Array(await response.arrayBuffer());
    assert.equal(response.status, expected, JSON.stringify(body));
    return body;
  }
}
const a = new Client(),
  b = new Client(),
  admin = new Client(),
  anon = new Client();
const data = {
  tpl: "B",
  designVersion: 2,
  primary: "#173E35",
  accent: "#44B68A",
  background: "#FCFBF6",
  firstName: "Nadia",
  lastName: "Bennani",
  company: "",
  title: "Direction",
  city: "Casablanca",
  desc: "",
  address: "",
  website: "",
  whatsapp: "",
  instagram: "",
  linkedin: "",
  facebook: "",
  lang: "fr",
  fontTitle: "Poppins",
  fontBody: "Lora",
  phones: [["Mobile", "+212600000000"]],
  emails: [""],
  show: { phones: true, emails: true },
  logoTile: false,
};
const order = (card_id) => ({
  card_id,
  quantity: 1,
  billing_type: "person",
  billing_name: "Nadia",
  ice: "",
  country: "Maroc",
  address: "12 rue de démonstration",
  rights: true,
  terms: true,
});
const upload = (name, bytes, type = "application/octet-stream") => {
  const f = new FormData();
  f.set("file", new Blob([bytes], { type }), name);
  return f;
};
try {
  for (const [client, email] of [
    [a, "fonts-a@example.com"],
    [b, "fonts-b@example.com"],
    [admin, "fonts-admin@example.com"],
  ])
    await client.request("auth/register", {
      name: "Recette polices",
      email,
      password: "TestPassword123",
      confirmation: "TestPassword123",
      terms: true,
    });
  await db.query(
    "UPDATE users SET verified_at=now() WHERE email LIKE 'fonts-%@example.com'",
  );
  await db.query(
    "UPDATE users SET is_admin=true WHERE email='fonts-admin@example.com'",
  );
  const blank = await a.request("cards", {
    ...data,
    firstName: "",
    lastName: "",
    phones: [],
    emails: ["adresse-incomplete"],
  });
  assert.equal(blank.data.emails[0], "adresse-incomplete");
  pass("le brouillon conserve les informations incomplètes ou invalides");
  const incomplete = await a.request("orders", order(blank.id), 422);
  assert.ok(incomplete.issues.some((issue) => issue.field === "firstName"));
  assert.ok(incomplete.issues.some((issue) => issue.field === "emails.0"));
  pass("la commande renvoie les champs et étapes à corriger");
  const essential = await a.request("cards", { ...data, tpl: "A" });
  assert.equal(
    (await a.request("orders", order(essential.id), 422)).issues[0].field,
    "logo",
  );
  pass("le modèle Essentiel ne peut être commandé sans logo");
  for (const [name, bytes] of [
    ["faux.ttf", Buffer.from("<script>alert(1)</script>")],
    ["vide.otf", Buffer.alloc(0)],
    ["faux.woff2", Buffer.alloc(200)],
    ["image.png", await readFile("tests/fixtures/logo.png")],
    ["lourd.ttf", Buffer.alloc(2 * 1024 * 1024 + 1)],
  ])
    await a.request("fonts", upload(name, bytes), 422);
  pass(
    "les fausses polices, extensions incompatibles, fichiers vides et lourds sont refusés",
  );
  const ttf = await readFile("public/assets/moontime-400.ttf");
  const font = await a.request("fonts", upload("Charte.ttf", ttf));
  assert.match(font.family, /MoonTime/i);
  const duplicate = await a.request("fonts", upload("Autre-nom.ttf", ttf));
  assert.equal(duplicate.id, font.id);
  pass("import TTF : nom réel extrait et doublon réutilisé");
  await a.request(
    "fonts",
    upload("Charte.woff", await readFile("public/assets/moontime-400.woff")),
  );
  const face = fontCatalog.find((font) => font.family === "Poppins").faces[0];
  await a.request(
    "fonts",
    upload("Charte.woff2", await readFile("public" + face.src)),
  );
  await a.request(
    "fonts",
    upload("Charte.otf", await readFile("tests/fixtures/moontime.otf")),
  );
  assert.equal((await a.request("fonts")).length, 4);
  pass("imports OTF, WOFF et WOFF2 conservés dans la bibliothèque personnelle");
  await anon.request("fonts", undefined, 401);
  await anon.request("fonts/" + font.id, undefined, 404);
  await b.request("fonts/" + font.id, undefined, 404);
  pass("bibliothèque et fichiers privés isolés entre les comptes");
  await b.request(
    "cards",
    { ...data, fontTitle: "custom:" + font.id, customFonts: [font] },
    422,
  );
  await a.request(
    "cards",
    { ...data, fontTitle: "custom:" + "-".repeat(36) },
    422,
  );
  await a.request("cards", { ...data, fontTitle: "Poppins; color:red" }, 422);
  pass("les références étrangères et injections de police sont refusées");
  const card = await a.request("cards", {
    ...data,
    fontTitle: "custom:" + font.id,
    customFonts: [{ ...font, family: "Nom falsifié", weight: "900" }],
  });
  assert.equal(card.data.customFonts[0].family, font.family);
  assert.equal(card.data.customFonts[0].weight, font.weight);
  pass("la métadonnée de police vient du fichier, pas du client");
  const share = await a.request("cards/" + card.id + "/share-preview", {}),
    token = new URL(share.url).searchParams.get("token");
  const preview = await anon.request("preview/" + token);
  assert.match(
    preview.data.customFonts[0].previewSource,
    /^data:font\/ttf;base64,/,
  );
  await anon.request("fonts/" + font.id, undefined, 404);
  pass("l’aperçu privé incorpore la police sans rendre son URL publique");
  const updated = await a.request("cards/" + card.id, {
    ...card.data,
    title: "Nouvelle fonction",
  });
  await a.request("orders", order(card.id), 409, {
    "X-Popcard-Version": card.draft_version,
  });
  pass(
    "un aperçu périmé ne peut pas être commandé après modification concurrente",
  );
  const results = await Promise.all([
    a.request("orders", order(card.id), 200, {
      "X-Popcard-Version": updated.draft_version,
    }),
    a.request("orders", order(card.id), 200, {
      "X-Popcard-Version": updated.draft_version,
    }),
  ]);
  assert.equal(results[0].id, results[1].id);
  const o = results[0];
  const confirmations = await db.query(
    "SELECT count(*) FROM mail_outbox WHERE subject=$1",
    ["Votre commande " + o.reference],
  );
  assert.equal(Number(confirmations.rows[0].count), 1);
  assert.equal(o.amount, 400);
  pass(
    "deux confirmations simultanées créent une seule commande au prix serveur",
  );
  const attempted = await a.request("cards/" + card.id, {
    ...updated.data,
    fontTitle: "Roboto",
    customFonts: [],
  });
  assert.equal(attempted.data.fontTitle, "custom:" + font.id);
  assert.equal(attempted.data.customFonts[0].id, font.id);
  pass("la police et l’identité commandées restent verrouillées");
  await a.request(
    "orders/" + o.id + "/receipt",
    upload(
      "virement.png",
      await readFile("tests/fixtures/logo.png"),
      "image/png",
    ),
  );
  for (const status of ["verified", "production", "shipped"]) {
    if (status === "shipped") {
      const denied = await admin.request(
        "admin/orders/" + o.id,
        {
          status,
          note: "",
          tracking: "",
          bank_confirmed: true,
          rights_confirmed: true,
        },
        422,
      );
      assert.match(denied.error, /suivi/i);
    }
    await admin.request("admin/orders/" + o.id, {
      status,
      note: "Recette locale",
      tracking: status === "shipped" ? "TEST-250" : "",
      bank_confirmed: true,
      rights_confirmed: true,
    });
    if (status !== "shipped")
      await anon.request("fonts/" + font.id, undefined, 404);
  }
  assert.equal((await anon.request("fonts/" + font.id)).byteLength, ttf.length);
  const published = await anon.request("public/" + card.slug);
  assert.equal(published.data.fontTitle, "custom:" + font.id);
  pass("la police devient accessible avec le mini-site à l’expédition");
  const receipt = (await a.request("orders/" + o.id)).receipt_id;
  await anon.request("files/" + receipt, undefined, 404);
  pass("la publication ne divulgue pas le justificatif de paiement");
  await admin.request("admin/cards/" + card.id, { status: "suspended" });
  await anon.request("fonts/" + font.id, undefined, 404);
  pass("la suspension retire aussi l’accès public à la police privée");
  const raw = await fetch(base + "/api/fonts", {
    method: "POST",
    headers: { Origin: "https://evil.example", cookie: a.cookie },
    body: upload("font.ttf", ttf),
  });
  assert.equal(raw.status, 403);
  pass("l’import de police conserve la protection CSRF");
  console.log(
    "PASS : " + checks + " scénarios complémentaires polices et commande.",
  );
} finally {
  await db.end();
}
