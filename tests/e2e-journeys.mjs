// Parcours utilisateurs complets dans un vrai navigateur (Chromium), du visiteur
// à l'administrateur, y compris les erreurs de saisie et les tentatives d'abus.
// Base PGlite isolée, MAIL_MODE=log : aucun e-mail réel n'est envoyé.
import { launchBrowser } from "./browser.mjs";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import pg from "pg";

const base = "http://localhost:3000";
const children = [];
const launch = (args, env = {}) => {
  const p = spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, ...env } });
  children.push(p);
  return p;
};
const steps = [];
const step = async (label, fn) => {
  const t = Date.now();
  try {
    await fn();
    steps.push("✓ " + label + ` (${Date.now() - t} ms)`);
  } catch (e) {
    steps.push("✗ " + label);
    console.log(steps.join("\n"));
    await mkdir("tests/audit", { recursive: true });
    for (const [n, p] of Object.entries(pages)) {
      await p.screenshot({ path: `tests/audit/e2e-echec-${n}.png`, fullPage: true }).catch(() => {});
      console.log(n, p.url(), "| statut :", await p.getByRole("status").allInnerTexts().catch(() => []));
    }
    throw e;
  }
};
const pages = {};
let browser;
try {
  launch(["tests/db-server.mjs"]);
  launch(["dist/server.js"], {
    HOSTNAME: "127.0.0.1", PORT: "3000",
    DATABASE_URL: "postgresql://postgres@127.0.0.1:55432/postgres",
    APP_URL: base, MAIL_MODE: "log",
    POPCARD_ORDERS_ENABLED: "true", POPCARD_BANK_NAME: "Attijariwafa Bank", POPCARD_BANK_HOLDER: "SALI DigiCom",
    POPCARD_BANK_RIB: "007780000123456789012345", POPCARD_SHIPPING_MA: "0", POPCARD_SHIPPING_INT: "150",
  });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) {
    try { up = (await fetch(base + "/api/config")).ok; } catch {}
    if (!up) await new Promise((r) => setTimeout(r, 300));
  }
  if (!up) throw Error("Serveur de test indisponible");
  await new Promise((r) => setTimeout(r, 800));
  let db;
  for (let i = 0; ; i++) {
    db = new pg.Client({ connectionString: "postgresql://postgres@127.0.0.1:55432/postgres" });
    db.on("error", () => {});
    try { await db.connect(); break; } catch (e) { if (i > 60) throw e; await new Promise((r) => setTimeout(r, 300)); }
  }
  const lastLink = async (email, kind) => {
    const r = await db.query("SELECT body FROM mail_outbox WHERE recipient=$1 AND body LIKE $2 ORDER BY created_at DESC LIMIT 1", [email, "%/" + kind + "?token=%"]);
    return r.rows[0].body.match(/https?:\/\/\S+/)[0].replace(base, "");
  };

  browser = await launchBrowser();
  const problems = [];
  const watch = (page, who) => {
    pages[who] = page;
    page.on("pageerror", (e) => problems.push(`${who} pageerror ${e.message}`));
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error" && !/Failed to load resource/.test(t)) problems.push(`${who} console ${t.slice(0, 200)}`);
      if (/Content Security Policy|Refused to/.test(t)) problems.push(`${who} CSP ${t.slice(0, 200)}`);
    });
    page.on("dialog", (d) => { problems.push(`${who} dialog inattendu: ${d.message()}`); d.dismiss(); });
  };
  const status = (page, re) => page.getByRole("status").filter({ hasText: re }).first().waitFor();

  const client = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await client.newPage();
  page.setDefaultTimeout(15000);
  watch(page, "client");
  const email = "parcours@example.com";

  await step("Landing → bouton d’inscription", async () => {
    await page.goto(base);
    await page.locator(".landing").getByRole("link", { name: /Créer ma PopCard/ }).first().click();
    await page.waitForURL("**/inscription");
  });
  await step("Inscription : formulaire vide bloqué par le navigateur", async () => {
    await page.getByRole("button", { name: /Créer mon compte/ }).click();
    assert.equal(await page.getByLabel("Nom complet").evaluate((el) => el.validity.valueMissing), true);
    assert.ok(page.url().endsWith("/inscription"));
  });
  await step("Inscription : mots de passe différents", async () => {
    await page.getByLabel("Nom complet").fill("Parcours Complet");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("TestPassword123");
    await page.getByLabel("Confirmer le mot de passe").fill("TestPassword124");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Créer mon compte/ }).click();
    await status(page, "Les mots de passe diffèrent.");
  });
  await step("Inscription : mot de passe sans chiffre → message explicite", async () => {
    await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasselong");
    await page.getByLabel("Confirmer le mot de passe").fill("motdepasselong");
    await page.getByRole("button", { name: /Créer mon compte/ }).click();
    await status(page, /10 caractères minimum/);
  });
  await step("Inscription valide → espace client + bandeau de vérification", async () => {
    await page.getByLabel("Mot de passe", { exact: true }).fill("TestPassword123");
    await page.getByLabel("Confirmer le mot de passe").fill("TestPassword123");
    await page.getByRole("button", { name: /Créer mon compte/ }).click();
    await page.waitForURL("**/app");
    await page.getByText("Votre e-mail reste à vérifier").waitFor();
  });
  await step("Renvoyer le lien de vérification", async () => {
    await page.getByRole("button", { name: "Renvoyer le lien" }).click();
    await status(page, /journal des emails/);
  });
  await step("Déconnexion puis retour arrière : l’espace reste fermé", async () => {
    await page.getByRole("button", { name: /Se déconnecter/ }).click();
    await page.waitForURL("**/connexion");
    await page.goto(base + "/app/orders");
    await page.getByText("Connectez-vous pour continuer.").waitFor();
  });
  await step("Connexion : mauvais mot de passe", async () => {
    await page.goto(base + "/connexion");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("Mauvais123456");
    await page.getByRole("button", { name: /Se connecter/ }).click();
    await status(page, "E-mail ou mot de passe incorrect.");
  });
  let resetLink;
  await step("Mot de passe oublié → lien → nouveau mot de passe", async () => {
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await page.getByRole("heading", { name: "Un nouveau départ." }).waitFor();
    await page.getByLabel("Adresse e-mail").fill(email.toUpperCase());
    await page.getByRole("button", { name: /Préparer le lien/ }).click();
    await status(page, /Si ce compte existe/);
    resetLink = await lastLink(email, "reinitialisation");
    await page.goto(base + resetLink);
    await page.getByLabel("Mot de passe", { exact: true }).fill("NouveauPass123");
    await page.getByLabel("Confirmer le mot de passe").fill("NouveauPass123");
    await page.getByRole("button", { name: /Enregistrer mon mot de passe/ }).click();
    await status(page, "Mot de passe modifié.");
  });
  await step("Lien de réinitialisation réutilisé → refusé", async () => {
    await page.goto(base + resetLink);
    await page.getByLabel("Mot de passe", { exact: true }).fill("EncoreAutre123");
    await page.getByLabel("Confirmer le mot de passe").fill("EncoreAutre123");
    await page.getByRole("button", { name: /Enregistrer mon mot de passe/ }).click();
    await status(page, "Lien expiré ou déjà utilisé.");
  });
  await step("Ancien mot de passe refusé, nouveau accepté", async () => {
    await page.goto(base + "/connexion");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("TestPassword123");
    await page.getByRole("button", { name: /Se connecter/ }).click();
    await status(page, "E-mail ou mot de passe incorrect.");
    await page.getByLabel("Mot de passe", { exact: true }).fill("NouveauPass123");
    await page.getByRole("button", { name: /Se connecter/ }).click();
    await page.waitForURL("**/app");
  });
  await step("Vérification d’e-mail par le lien, puis lien réutilisé", async () => {
    const link = await lastLink(email, "verification");
    await page.goto(base + link);
    await page.getByRole("button", { name: /Vérifier mon adresse/ }).click();
    await status(page, "Adresse vérifiée.");
    await page.goto(base + link);
    await page.getByRole("button", { name: /Vérifier mon adresse/ }).click();
    await status(page, "Lien expiré ou déjà utilisé.");
  });
  let cardUrl;
  await step("Éditeur : modèle Épuré, champs avec HTML et lien javascript:", async () => {
    await page.goto(base + "/app/cards/new");
    await page.getByRole("button", { name: /Épuré/ }).click();
    await page.getByRole("button", { name: /3\s*Informations/ }).click();
    await page.getByLabel("Prénom", { exact: true }).fill('<img src=x onerror="window.__xss=1">');
    await page.getByLabel("Nom", { exact: true }).fill("Kouassi");
    await page.getByLabel("Société", { exact: true }).fill("SALI DigiCom");
    await page.getByLabel("Site web · URL https://").fill("javascript:window.__xss=2");
    await page.getByLabel("Instagram · URL https://").fill("https://instagram.com/sali");
    assert.equal(await page.getByLabel("Prénom", { exact: true }).getAttribute("maxlength"), "100");
    await page.locator(".previewtabs button", { hasText: /^Mini-site$/ }).click();
    await page.locator(".reference-mini .ms-name").filter({ hasText: "<img" }).waitFor();
    const hrefs = await page.locator(".reference-mini a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.ok(hrefs.every((h) => !/^\s*(javascript|data):/i.test(h || "")), "lien dangereux : " + hrefs.join(" "));
    assert.equal(await page.evaluate(() => window.__xss), undefined);
  });
  await step("Enregistrer le brouillon puis commander (case de confirmation obligatoire)", async () => {
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await status(page, "Brouillon enregistré.");
    await page.getByRole("button", { name: /4\s*Aperçu/ }).click();
    const order = page.getByRole("button", { name: /Commander/ });
    assert.equal(await order.isDisabled(), true);
    await page.getByLabel("J’ai vérifié mes aperçus et mes coordonnées.").check();
    await order.click();
    await page.waitForURL(/\/checkout$/);
    cardUrl = page.url().replace("/checkout", "");
  });
  await step("Commande : quantité invalide, ICE invalide, puis commande valide", async () => {
    await page.getByLabel("Quantité").fill("0");
    await page.locator(".total").filter({ hasText: "Quantité invalide" }).waitFor();
    await page.getByLabel("Quantité").fill("3");
    await page.getByLabel("Pays de livraison").selectOption("France");
    const total = await page.locator(".total").innerText();
    assert.match(total.replace(/\s/g, ""), /1[ .,\u202f]?050/);
    await page.locator('select[name="billing_type"]').selectOption("company");
    await page.getByLabel("ICE · 15 chiffres pour une entreprise").fill("123");
    await page.getByLabel("Adresse complète de livraison").fill("10 rue de Paris, 75001 Paris");
    await page.getByLabel(/Je dispose des droits/).check();
    await page.getByLabel(/J’ai vérifié les informations/).check();
    await page.getByRole("button", { name: /passer au virement/ }).click();
    await status(page, "ICE : 15 chiffres requis.");
    await page.getByLabel("ICE · 15 chiffres pour une entreprise").fill("123456789012345");
    await page.getByRole("button", { name: /passer au virement/ }).click();
    await page.waitForURL(/\/app\/orders\/[0-9a-f-]{36}$/);
    await page.getByText("007780000123456789012345").waitFor();
  });
  const orderUrl = page.url();
  await step("Dépôt du justificatif : mauvais format puis PDF valide", async () => {
    const input = page.getByLabel(/Déposer le justificatif/);
    await input.setInputFiles({ name: "recu.txt", mimeType: "text/plain", buffer: Buffer.from("pas un pdf") });
    await page.getByRole("button", { name: "Envoyer le justificatif" }).click();
    await status(page, /Format autorisé/);
    await input.setInputFiles({ name: "recu.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nreçu de virement") });
    await page.getByRole("button", { name: "Envoyer le justificatif" }).click();
    await status(page, /Justificatif reçu/);
    await page.getByRole("link", { name: /Consulter mon justificatif/ }).waitFor();
  });
  await step("Client : /app/admin n’ouvre pas l’administration, /production refusée", async () => {
    await page.goto(base + "/app/admin");
    await page.getByRole("heading", { name: "Un coup de main ?" }).waitFor();
    assert.equal(await page.getByRole("link", { name: /Administration/ }).count(), 0);
    const oid = orderUrl.split("/").pop();
    const r = await page.request.get(base + "/api/admin/orders/" + oid);
    assert.equal(r.status(), 403);
  });

  // ---- Administrateur -----------------------------------------------------
  await db.query("INSERT INTO users(id,email,name,password_hash,is_admin,verified_at) SELECT gen_random_uuid(),'chef@example.com','Chef SALI',password_hash,true,now() FROM users WHERE email=$1", [email]);
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await adminCtx.newPage();
  admin.setDefaultTimeout(15000);
  watch(admin, "admin");
  await step("Admin : connexion et accès au cockpit", async () => {
    await admin.goto(base + "/connexion");
    await admin.getByLabel("Adresse e-mail").fill("chef@example.com");
    await admin.getByLabel("Mot de passe", { exact: true }).fill("NouveauPass123");
    await admin.getByRole("button", { name: /Se connecter/ }).click();
    await admin.waitForURL("**/app");
    await admin.getByRole("link", { name: /Administration/ }).click();
    await admin.getByRole("heading", { name: "Le cockpit PopCard." }).waitFor();
  });
  const treat = async (statusLabel, { bank = false, rights = false, tracking = "" } = {}) => {
    await admin.getByRole("button", { name: /Traiter/ }).first().click();
    await admin.getByLabel("Prochaine étape").selectOption({ label: statusLabel });
    if (bank) await admin.getByLabel(/confirmé la réception du versement/).check();
    if (rights) await admin.getByLabel(/droits d’utilisation ont été vérifiés/).check();
    if (tracking) await admin.getByLabel(/Numéro de suivi/).fill(tracking);
    await admin.getByRole("button", { name: "Mettre à jour" }).click();
  };
  const stateCell = (label) => admin.locator(".table-wrap td", { hasText: new RegExp("^" + label + "$") }).first().waitFor();
  await step("Admin : validation refusée sans les deux confirmations", async () => {
    await treat("Paiement validé");
    await status(admin, /Confirmez le versement et les droits/);
    await admin.getByRole("button", { name: "Fermer" }).click();
  });
  await step("Admin : paiement validé → production", async () => {
    await treat("Paiement validé", { bank: true, rights: true });
    await stateCell("Paiement validé");
    await treat("En production");
    await stateCell("En production");
  });
  await step("Admin : expédition refusée sans numéro de suivi, puis acceptée", async () => {
    await treat("Expédiée");
    await status(admin, "Numéro de suivi requis.");
    await admin.getByRole("button", { name: "Fermer" }).click();
    await treat("Expédiée", { tracking: "AMANA-123" });
    await stateCell("Expédiée");
  });
  let slug;
  await step("Client : suivi « Expédiée » avec numéro, mini-site publié", async () => {
    await page.goto(orderUrl);
    await page.getByText("Suivi : AMANA-123").waitFor();
    await page.goto(base + "/app");
    await page.locator(".stats article", { hasText: "Mini-sites publiés" }).locator("strong").filter({ hasText: "1" }).waitFor();
    slug = (await db.query("SELECT slug FROM cards WHERE status='live' LIMIT 1")).rows[0].slug;
  });
  const visitor = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  watch(visitor, "visiteur");
  await step("Visiteur anonyme : mini-site public sans lien dangereux ni script exécuté", async () => {
    await visitor.goto(base + "/p/" + slug);
    await visitor.locator(".ms-name").waitFor();
    const hrefs = await visitor.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.ok(hrefs.every((h) => !/^\s*(javascript|data):/i.test(h || "")));
    assert.equal(await visitor.evaluate(() => window.__xss), undefined);
    await visitor.getByRole("link", { name: "instagram" }).waitFor();
  });
  await step("Admin : suspension → mini-site indisponible → réactivation", async () => {
    await admin.getByRole("button", { name: "PopCards", exact: true }).click();
    await admin.getByRole("button", { name: "Suspendre" }).click();
    await admin.getByRole("button", { name: "Réactiver" }).waitFor();
    await visitor.reload();
    await visitor.getByRole("heading", { name: "Cette PopCard n’est pas disponible." }).waitFor();
    await admin.getByRole("button", { name: "Réactiver" }).click();
    await admin.getByRole("button", { name: "Suspendre" }).waitFor();
    await visitor.reload();
    await visitor.locator(".ms-name").waitFor();
  });
  await step("Admin : journal des e-mails et liste des clients", async () => {
    await admin.getByRole("button", { name: "Journal des emails", exact: true }).click();
    await admin.locator("details.panel").first().waitFor();
    await admin.getByRole("button", { name: "Clients", exact: true }).click();
    await admin.getByRole("cell", { name: email }).waitFor();
  });
  await step("Client : identité verrouillée après commande", async () => {
    await page.goto(cardUrl);
    await page.getByRole("heading", { name: "Actualisez votre mini-site." }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Épuré/ }).isDisabled(), true);
    await page.getByRole("button", { name: /2\s*Identité visuelle/ }).click();
    await page.getByText(/est verrouillée/).first().waitFor();
  });
  await step("Client : coordonnées toujours modifiables après publication", async () => {
    await page.getByRole("button", { name: /3\s*Informations/ }).click();
    await page.getByLabel("Fonction", { exact: true }).fill("Directeur");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await status(page, "Brouillon enregistré.");
    await visitor.reload();
    await visitor.getByText("Directeur").first().waitFor();
  });
  await step("Profil : changer d’e-mail exige le mot de passe, ICE invalide refusé", async () => {
    await page.goto(base + "/app/profile");
    await page.getByLabel("Adresse e-mail").fill("nouveau@example.com");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await status(page, "Votre mot de passe actuel est requis.");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("ICE").fill("12");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await status(page, /ICE/);
    await page.getByLabel("ICE").fill("");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await status(page, "Profil enregistré.");
  });
  await step("Compte : mauvais mot de passe actuel refusé", async () => {
    await page.goto(base + "/app/account");
    await page.getByLabel("Mot de passe actuel").fill("Faux1234567");
    await page.getByLabel(/Nouveau mot de passe/).fill("Different123");
    await page.getByLabel("Confirmer le nouveau mot de passe").fill("Different123");
    await page.getByRole("button", { name: "Modifier mon mot de passe" }).click();
    await status(page, "Mot de passe actuel incorrect.");
  });
  await step("Liens cassés : mini-site inconnu, aperçu invalide", async () => {
    await visitor.goto(base + "/p/nexistepas");
    await visitor.getByRole("heading", { name: "Cette PopCard n’est pas disponible." }).waitFor();
    await visitor.goto(base + "/apercu?token=bidon");
    await visitor.getByText(/introuvable ou expiré/).first().waitFor();
  });
  await step("Mobile : menu ouvert, navigation, menu refermé", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/app");
    await page.getByRole("button", { name: /Menu/ }).click();
    await page.locator(".sidebar.open").waitFor();
    await page.locator(".sidebar").getByRole("link", { name: "Mes commandes" }).click();
    await page.waitForURL("**/app/orders");
    await page.locator(".sidebar.open").waitFor({ state: "detached" });
  });
  await step("Aucune erreur JavaScript ni violation CSP pendant tout le parcours", async () => {
    assert.deepEqual(problems, []);
  });
  await db.end();
  await mkdir("tests/audit", { recursive: true });
  await writeFile("tests/audit/e2e.txt", steps.join("\n"));
  console.log(steps.join("\n"));
  console.log(`\nPASS E2E : ${steps.length} étapes.`);
} finally {
  await browser?.close();
  for (const p of children) p.kill("SIGTERM");
}
