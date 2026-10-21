import assert from "node:assert/strict";
import pg from "pg";
import {readFile} from "node:fs/promises";
const db = new pg.Client({
  connectionString: "postgresql://postgres@127.0.0.1:55432/postgres",
});
await db.connect();
const base = "http://localhost:3000";
class Browser {
  cookie = "";
  async call(p, data, expected = 200) {
    const r = await fetch(base + "/api/" + p, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        ...(data === undefined ? {} : { Origin: base }),
        ...(data instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body:
        data === undefined
          ? undefined
          : data instanceof FormData
            ? data
            : JSON.stringify(data),
    });
    const c = r.headers.get("set-cookie");
    if (c) this.cookie = c.split(";")[0];
    const body = await r.json();
    assert.equal(r.status, expected, JSON.stringify(body));
    return body;
  }
}
const a = new Browser(),
  b = new Browser(),
  admin = new Browser();
// Lien reçu par e-mail : journal admin en mode log, message SMTP réellement
// reçu en mode smtp (le journal masque alors les liens après envoi).
const tokenFor = async (recipient, kind) => {
  if (process.env.TEST_SMTP === "true") {
    const raw = await readFile("tests/.smtp-outbox.txt", "utf8");
    const found = raw
      .split(/\r?\n=====\r?\n/)
      .map((m) =>
        m
          .replace(/=\r?\n/g, "")
          .replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
      )
      .filter((m) => m.toLowerCase().includes("to: " + recipient))
      .map((m) => m.match(new RegExp("/" + kind + "\\?token=([a-f0-9]{64})"))?.[1])
      .filter(Boolean);
    const logged = await admin.call("admin/mail");
    assert.ok(logged.every((m) => !/token=[a-f0-9]{64}/.test(m.body)), "Lien non masqué dans le journal");
    return found.at(-1);
  }
  return (await admin.call("admin/mail"))
    .find((m) => m.recipient === recipient && m.body.includes("/" + kind + "?token="))
    .body.split("token=")[1];
};
const data = {
  tpl: "B",
  primary: "#123456",
  accent: "#1D9878",
  firstName: "Christian",
  lastName: "Test",
  company: "SALI test",
  title: "Développeur",
  city: "Casablanca",
  desc: "Test",
  address: "",
  website: "https://example.com",
  whatsapp: "",
  instagram: "",
  linkedin: "",
  facebook: "",
  lang: "fr",
  fontTitle: "Montserrat",
  fontBody: "Open Sans",
  phones: [["Mobile", "0600000000"]],
  emails: ["client@example.com"],
  show: { desc: true, phones: true, emails: true, social: true },
  logoTile: false,
};
try {
  await a.call("auth/register", {
    name: "Client test",
    email: "client@example.com",
    password: "TestPassword123",
    confirmation: "TestPassword123",
    terms: true,
  });
  await b.call("auth/register", {
    name: "Autre client",
    email: "other@example.com",
    password: "TestPassword123",
    confirmation: "TestPassword123",
    terms: true,
  });
  await admin.call("auth/register", {
    name: "Admin test",
    email: "admin@example.com",
    password: "TestPassword123",
    confirmation: "TestPassword123",
    terms: true,
  });
  await db.query(
    "UPDATE users SET is_admin=true WHERE email='admin@example.com'",
  );
  assert.equal((await a.call("me")).email, "client@example.com");
  await a.call("admin/orders", undefined, 403);
  const c = await a.call("cards", data);
  await b.call("cards/" + c.id, undefined, 404);
  await b.call("cards/" + c.id, data, 404);
  await a.call("public/" + c.slug, undefined, 404);
  const invalid=new FormData();invalid.set('file',new Blob(['not an image'],{type:'image/png'}),'bad.png');
  await a.call('cards/'+c.id+'/logo',invalid,422);
  const logoForm=new FormData();
  const image=await readFile('tests/fixtures/logo.png');
  logoForm.set('file',new Blob([image],{type:'image/png'}),'logo.png');
  logoForm.set('original',new Blob([image],{type:'image/png'}),'original.png');
  const uploaded=await a.call('cards/'+c.id+'/logo',logoForm);
  assert.notEqual(uploaded.logo_id,uploaded.original_logo_id);
  assert.equal((await fetch(base+'/api/files/'+uploaded.original_logo_id)).status,404);
  const share=await a.call("cards/"+c.id+"/share-preview",{});
  assert.equal(share.status,process.env.TEST_SMTP==="true"?"sent":"log");
  const secret=new URL(share.url).searchParams.get("token");
  const anonymous=new Browser();
  assert.equal((await anonymous.call("preview/"+secret)).data.firstName,"Christian");
  assert.match((await anonymous.call("preview/"+secret)).logo,/^data:image\/png;base64,/);
  await anonymous.call("preview/invalid",undefined,404);
  await b.call("cards/"+c.id+"/share-preview",{},404);
  await db.query("UPDATE preview_links SET expires_at=now()-interval '1 day'");
  await anonymous.call("preview/"+secret,undefined,404);
  const order = {
    card_id: c.id,
    quantity: 2,
    billing_type: "person",
    billing_name: "Client test",
    ice: "",
    country: "Maroc",
    address: "Adresse de test Casablanca",
    rights: true,
    terms: true,
  };
  await a.call("orders", order, 403);
  const verification = await tokenFor("client@example.com", "verification");
  await a.call("auth/verify", { token: verification });
  await a.call("auth/verify", { token: verification }, 422);
  if(process.env.TEST_SMTP==="true"){const mail=await db.query("SELECT status FROM mail_outbox");assert.ok(mail.rows.length>=4);assert.ok(mail.rows.every(m=>m.status==="sent"));}
  const o = await a.call("orders", order);
  assert.equal(o.amount, 650);
  assert.equal((await a.call("orders", order)).id, o.id);
  await b.call("orders/" + o.id, undefined, 404);
  await admin.call(
    "admin/orders/" + o.id,
    {
      status: "verified",
      note: "",
      tracking: "",
      bank_confirmed: true,
      rights_confirmed: true,
    },
    422,
  );
  const f = new FormData();
  f.set(
    "file",
    new Blob(["%PDF-1.4\nTest receipt"], { type: "application/pdf" }),
    "receipt.pdf",
  );
  await a.call("orders/" + o.id + "/receipt", f);
  const receipt = (await a.call("orders/" + o.id)).receipt_id;
  const denied = await fetch(base + "/api/files/" + receipt, {
    headers: { cookie: b.cookie },
  });
  assert.equal(denied.status, 404);
  for (const status of ["verified", "production", "shipped", "delivered"]) {
    await admin.call("admin/orders/" + o.id, {
      status,
      note: "Test " + status,
      tracking: status === "shipped" ? "TRACK-001" : "",
      bank_confirmed: true,
      rights_confirmed: true,
    });
    if (["verified", "production"].includes(status))
      await a.call("public/" + c.slug, undefined, 404);
  }
  assert.equal((await a.call("public/" + c.slug)).id, c.id);
  assert.equal((await fetch(base+"/api/files/"+uploaded.logo_id)).status,200);
  assert.equal((await fetch(base+"/api/files/"+uploaded.original_logo_id)).status,404);
  await a.call("cards/" + c.id, {
    ...data,
    primary: "#ffffff",
    background:"#000000",
    title: "Nouvelle fonction",
  });
  const updated = await a.call("cards/" + c.id);
  assert.equal(updated.data.primary, "#123456");
  assert.equal(updated.data.background,"#FFFFFF");
  assert.equal(updated.data.title, "Nouvelle fonction");
  await admin.call("admin/cards/" + c.id, { status: "suspended" });
  await a.call("public/" + c.slug, undefined, 404);
  await admin.call("admin/cards/" + c.id, { status: "live" });
  await a.call("auth/forgot", { email: "client@example.com" });
  const reset = await tokenFor("client@example.com", "reinitialisation");
  await a.call("auth/reset", {
    token: reset,
    password: "NewPassword123",
    confirmation: "NewPassword123",
  });
  await a.call("me", undefined, 401);
  await a.call(
    "auth/login",
    { email: "client@example.com", password: "TestPassword123" },
    401,
  );
  await a.call("auth/login", {
    email: "client@example.com",
    password: "NewPassword123",
  });
  const otherSession=new Browser();await otherSession.call('auth/login',{email:'client@example.com',password:'NewPassword123'});
  await a.call('password',{current_password:'wrong',password:'FinalPassword123',confirmation:'FinalPassword123'},422);
  await a.call('password',{current_password:'NewPassword123',password:'FinalPassword123',confirmation:'FinalPassword123'});
  await otherSession.call('me',undefined,401);
  const profile={name:'Client test',email:'changed@example.com',billing_name:'Entreprise test',ice:'123456789012345',address:'Casablanca',current_password:'FinalPassword123'};
  await a.call('profile',{...profile,ice:'123'},422);
  await a.call('profile',{...profile,current_password:'wrong'},422);
  await a.call('profile',profile);
  assert.equal((await a.call('me')).verified_at,null);
  const changedLink=await tokenFor('changed@example.com','verification');
  await a.call('auth/verify',{token:changedLink});
  assert.ok((await a.call('me')).verified_at);
  const csrf = await fetch(base + "/api/cards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://attacker.example",
      cookie: a.cookie,
    },
    body: JSON.stringify(data),
  });
  assert.equal(csrf.status, 403);
  console.log(
    "PASS : inscription, connexion, vérification, isolation clients, commande, reçu privé, transitions administrateur, publication après production, suspension, verrouillage identité, réinitialisation et CSRF.",
  );
} finally {
  await db.end();
}
