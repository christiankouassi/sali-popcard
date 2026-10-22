// Real Chromium + a disposable PostgreSQL-compatible database. Fault injection
// changes transport only: successful writes always reach the real local API.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";
import { launchBrowser } from "./browser.mjs";
const base = "http://localhost:3000",
  children = [],
  results = [],
  errors = [];
const start = (args, env = {}) => {
  const child = spawn(process.execPath, args, {
    stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, ...env },
  });
  child.stderr.on("data", (b) => {
    const text = String(b);
    if (!/Client disconnected/.test(text)) process.stderr.write(text);
  });
  children.push(child);
  return child;
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser, db, page;
async function check(name, fn) {
  const now = Date.now();
  try {
    await fn();
    results.push({ name, status: "pass", ms: Date.now() - now });
    console.log("PASS " + name);
  } catch (e) {
    results.push({
      name,
      status: "fail",
      error: e.message,
      ms: Date.now() - now,
    });
    console.error("FAIL " + name + " — " + e.message);
    await page
      ?.screenshot({
        path: "tests/screenshots/failure-" + results.length + ".png",
        fullPage: true,
      })
      .catch(() => {});
  }
}
try {
  await mkdir("tests/screenshots", { recursive: true });
  start(["tests/db-server.mjs"]);
  start(["dist/server.js"], {
    HOSTNAME: "127.0.0.1",
    PORT: "3000",
    DATABASE_URL: "postgresql://postgres@127.0.0.1:55432/postgres",
    APP_URL: base,
    MAIL_MODE: "log",
    POPCARD_ORDERS_ENABLED: "true",
    POPCARD_BANK_HOLDER: "Test",
    POPCARD_BANK_RIB: "123",
  });
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base + "/api/config")).ok) break;
    } catch {}
    await pause(200);
  }
  for (let i = 0; i < 80; i++) {
    db = new pg.Client({
      connectionString: "postgresql://postgres@127.0.0.1:55432/postgres",
    });
    db.on("error", () => {});
    try {
      await db.connect();
      break;
    } catch (e) {
      await db.end().catch(() => {});
      if (i === 79) throw e;
      await pause(200);
    }
  }
  browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  const watch = (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (
        m.type() === "error" &&
        /Content Security Policy|Refused to/.test(m.text())
      )
        errors.push(m.text());
    });
  };
  watch(page);
  const call = async (path, data, headers = {}) => {
    const r = await context.request.fetch(base + "/api/" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: { ...(data === undefined ? {} : { Origin: base }), ...headers },
      ...(data === undefined ? {} : { data }),
    });
    return { status: r.status(), body: await r.json() };
  };
  const register = await call("auth/register", {
    name: "Recette PopCard",
    email: "qa@example.com",
    password: "TestPassword123",
    confirmation: "TestPassword123",
    terms: true,
  });
  assert.equal(register.status, 200);
  await db.query(
    "UPDATE users SET is_admin=true,verified_at=now() WHERE email='qa@example.com'",
  );
  const cards = async () => (await call("cards")).body;
  const waitServer = async (id, predicate) => {
    for (let i = 0; i < 80; i++) {
      const c = (await call("cards/" + id)).body;
      if (predicate(c)) return c;
      await pause(150);
    }
    throw Error("Le serveur ne contient pas la dernière saisie.");
  };
  const editor = async (id) => {
    await page.goto(base + "/app/cards/" + id);
    await page.getByRole("heading", { name: /Créons votre PopCard/ }).waitFor();
  };
  const information = async (p = page) => {
    await p.getByRole("button", { name: /3 Informations/ }).click();
  };
  let mode = "normal",
    updateSeen = 0;
  await page.route("**/api/cards**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (request.method() === "POST" && /^\/api\/cards\/[^/]+$/.test(path)) {
      updateSeen++;
      if (mode === "fail") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Coupure de test" }),
        });
        return;
      }
      if (mode === "slow") await pause(1200);
    }
    if (
      mode === "reject-create" &&
      request.method() === "POST" &&
      path === "/api/cards"
    ) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Coupure de test" }),
      });
      return;
    }
    if (
      mode === "lost-create" &&
      request.method() === "POST" &&
      path === "/api/cards"
    ) {
      await route.fetch();
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await check(
    "Page publique : cinq sections, photo chargée, aucune promesse NFC ou chiffre inventé",
    async () => {
      await page.goto(base);
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator(".landing-v3 main>section").count(), 5);
      assert.equal(
        await page.locator(".lp-photo-tile img").evaluate((img) =>
          img.complete
            ? img.naturalWidth > 0
            : new Promise((r) => {
                img.onload = () => r(img.naturalWidth > 0);
                img.onerror = () => r(false);
              }),
        ),
        true,
      );
      assert.doesNotMatch(
        await page.locator(".landing").innerText(),
        /88%|NFC|gravure|valable à vie/i,
      );
    },
  );
  await check(
    "Démonstration : changement au scroll, clic et clavier",
    async () => {
      await page
        .locator(".lp-process-step")
        .nth(2)
        .evaluate((el) =>
          el.scrollIntoView({ block: "center", behavior: "instant" }),
        );
      await page.locator('.lp-process-stage[data-active="2"]').waitFor();
      await page.locator(".lp-process-step").first().click();
      await page.locator('.lp-process-stage[data-active="0"]').waitFor();
      await page.locator(".lp-process-step").nth(1).focus();
      await page.keyboard.press("Enter");
      await page.locator('.lp-process-stage[data-active="1"]').waitFor();
    },
  );
  await check(
    "Galerie : trois modèles, deux faces et trois couleurs interactives",
    async () => {
      const gallery = page.locator(".lp-model-explorer");
      for (const name of ["Essentiel", "Signature", "Studio"]) {
        await gallery.getByRole("button", { name, exact: true }).click();
        assert.equal(await gallery.locator(".ref-card").count(), 1);
      }
      await gallery
        .getByRole("button", { name: "Signature", exact: true })
        .click();
      await gallery.getByRole("button", { name: "verso", exact: true }).click();
      await gallery.locator(".signature-qr").waitFor();
      await gallery.getByRole("button", { name: "Prune", exact: true }).click();
      assert.equal(
        await gallery
          .locator(".signature-verso")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        "rgb(99, 59, 74)",
      );
    },
  );
  await check(
    "Affichage public : 320, 390, 768, 1024, 1440 et 1920 px sans débordement",
    async () => {
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(base);
        await page.locator("h1").waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Débordement à " + width,
        );
      }
    },
  );
  await check(
    "Mouvements réduits : contenu visible et animations désactivées",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(base);
      assert.ok(
        await page
          .locator(".lp-card-entry")
          .evaluate(
            (el) => parseFloat(getComputedStyle(el).animationDuration) < 0.02,
          ),
      );
      for (const el of await page.locator(".lp-reveal").all())
        assert.equal(
          await el.evaluate((e) => getComputedStyle(e).opacity),
          "1",
        );
      await page.emulateMedia({ reducedMotion: "no-preference" });
    },
  );
  await check(
    "Captures de contrôle : page et dashboard desktop/mobile",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(base);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: `tests/screenshots/landing-${width}.png`,
          fullPage: true,
        });
        await page.goto(base + "/app");
        await page.locator(".dashboard-hero").waitFor();
        await page.screenshot({
          path: `tests/screenshots/dashboard-${width}.png`,
          fullPage: true,
        });
      }
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.setViewportSize({ width: 1440, height: 900 });
    },
  );
  await check(
    "Navigation rapide : le menu reste monté, aucun écran Chargement",
    async () => {
      await page.goto(base + "/app");
      await page.locator(".sidebar").waitFor();
      await page.evaluate(() => {
        window.qaSidebar = document.querySelector(".sidebar");
        window.qaFlashes = 0;
        new MutationObserver(() => {
          if (document.body.innerText.includes("Chargement de votre espace"))
            window.qaFlashes++;
        }).observe(document.body, { childList: true, subtree: true });
      });
      for (const href of [
        "/app/cards",
        "/app/orders",
        "/app/profile",
        "/app/account",
        "/app/help",
        "/app",
      ]) {
        await page.locator('.sidebar a[href="' + href + '"]').click();
        await page.waitForURL("**" + href);
        assert.equal(
          await page.evaluate(
            () => window.qaSidebar === document.querySelector(".sidebar"),
          ),
          true,
        );
      }
      assert.equal(await page.evaluate(() => window.qaFlashes), 0);
    },
  );
  await check(
    "Menu : bas toujours accessible sur écrans de faible hauteur",
    async () => {
      for (const size of [
        { width: 1280, height: 420 },
        { width: 1024, height: 500 },
        { width: 820, height: 420 },
      ]) {
        await page.setViewportSize(size);
        const bottom = await page
          .getByRole("button", { name: /Se déconnecter/ })
          .boundingBox();
        assert.ok(
          bottom && bottom.y >= 0 && bottom.y + bottom.height <= size.height,
        );
        const nav = page.locator(".sidebar-scroll");
        await nav.evaluate((el) => (el.scrollTop = el.scrollHeight));
        const help = await page
          .locator('.sidebar a[href="/app/help"]')
          .boundingBox();
        assert.ok(help && help.y + help.height <= size.height);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    },
  );
  await check(
    "Menu mobile : ouverture, fermeture par Échap et arrière-plan bloqué",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: /Menu/ }).click();
      assert.equal(
        await page.locator(".sidebar").evaluate((el) => el.inert),
        false,
      );
      assert.equal(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator(".sidebar").evaluate((el) => el.inert),
        true,
      );
      assert.notEqual(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      await page.setViewportSize({ width: 1440, height: 900 });
    },
  );
  await check(
    "Création : une visite vide ne crée aucun brouillon parasite",
    async () => {
      const before = (await cards()).length;
      await editor("new");
      await pause(1000);
      assert.equal((await cards()).length, before);
    },
  );
  let cardId;
  await check(
    "Dernière saisie puis départ immédiat : brouillon réellement enregistré",
    async () => {
      await information();
      await page.getByLabel("Prénom", { exact: true }).fill("Départ immédiat");
      await page.locator('.sidebar a[href="/app/cards"]').click();
      await page.waitForURL("**/app/cards");
      const list = await cards();
      const card = list.find((c) => c.data.firstName === "Départ immédiat");
      assert.ok(card);
      cardId = card.id;
      assert.equal(list.length, 1);
    },
  );
  if (!cardId)
    throw Error(
      "Le scénario de création doit réussir pour poursuivre la recette.",
    );
  await check(
    "Rechargement avant le délai de sauvegarde : dernière saisie récupérée",
    async () => {
      await editor(cardId);
      await information();
      await page
        .getByLabel("Prénom", { exact: true })
        .fill("Rechargement express");
      await page.reload();
      await page
        .getByRole("heading", { name: /Créons votre PopCard/ })
        .waitFor();
      await information();
      assert.equal(
        await page.getByLabel("Prénom", { exact: true }).inputValue(),
        "Rechargement express",
      );
      await waitServer(
        cardId,
        (c) => c.data.firstName === "Rechargement express",
      );
    },
  );
  await check(
    "Échec serveur puis rechargement : récupération locale et reprise",
    async () => {
      mode = "fail";
      await page.getByLabel("Prénom", { exact: true }).fill("Sauvé localement");
      await page
        .locator(".save-status-pill")
        .filter({ hasText: "À synchroniser" })
        .waitFor();
      await page.reload();
      await page
        .getByRole("heading", { name: /Créons votre PopCard/ })
        .waitFor();
      await information();
      assert.equal(
        await page.getByLabel("Prénom", { exact: true }).inputValue(),
        "Sauvé localement",
      );
      await pause(800);
      mode = "normal";
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await waitServer(cardId, (c) => c.data.firstName === "Sauvé localement");
    },
  );
  await check(
    "Coupure hors ligne puis retour du réseau : resynchronisation",
    async () => {
      await context.setOffline(true);
      await page.getByLabel("Prénom", { exact: true }).fill("Retour réseau");
      await pause(900);
      await context.setOffline(false);
      await page.evaluate(() => dispatchEvent(new Event("online")));
      await waitServer(cardId, (c) => c.data.firstName === "Retour réseau");
    },
  );
  await check(
    "Réseau lent et saisies pendant l’envoi : la plus récente gagne",
    async () => {
      mode = "slow";
      const seen = updateSeen;
      await page
        .getByLabel("Prénom", { exact: true })
        .fill("Version intermédiaire");
      for (let i = 0; i < 20 && updateSeen === seen; i++) await pause(100);
      await page.getByLabel("Prénom", { exact: true }).fill("Version finale");
      await page.locator('.sidebar a[href="/app/cards"]').click();
      await page.waitForURL("**/app/cards");
      await waitServer(cardId, (c) => c.data.firstName === "Version finale");
      mode = "normal";
    },
  );
  await check(
    "Réponse de création perdue : la relance ne crée aucun doublon",
    async () => {
      const before = (await cards()).length;
      mode = "lost-create";
      await editor("new");
      await information();
      await page.getByLabel("Prénom", { exact: true }).fill("Création unique");
      await page
        .locator(".save-status-pill")
        .filter({ hasText: "À synchroniser" })
        .waitFor();
      assert.equal((await cards()).length, before + 1);
      mode = "normal";
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await page.waitForURL(/\/app\/cards\/[0-9a-f-]{36}$/);
      assert.equal((await cards()).length, before + 1);
    },
  );
  await check(
    "Brouillon jamais envoyé : reprise visible depuis la liste",
    async () => {
      const before = (await cards()).length;
      mode = "reject-create";
      await editor("new");
      await information();
      await page
        .getByLabel("Prénom", { exact: true })
        .fill("Brouillon local visible");
      await page
        .locator(".save-status-pill")
        .filter({ hasText: "À synchroniser" })
        .waitFor();
      await page.locator('.sidebar a[href="/app/cards"]').click();
      await page.waitForURL("**/app/cards");
      assert.equal((await cards()).length, before);
      await page
        .locator(".local-drafts")
        .getByRole("link", { name: /Reprendre Brouillon local visible/ })
        .click();
      await page
        .getByRole("heading", { name: /Créons votre PopCard/ })
        .waitFor();
      await information();
      assert.equal(
        await page.getByLabel("Prénom", { exact: true }).inputValue(),
        "Brouillon local visible",
      );
      mode = "normal";
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await page.waitForURL(/\/app\/cards\/[0-9a-f-]{36}$/);
      assert.equal((await cards()).length, before + 1);
    },
  );
  await check(
    "Deux onglets : conflit visible, aucune écriture silencieuse par-dessus",
    async () => {
      await editor(cardId);
      await information();
      const other = await context.newPage();
      watch(other);
      await other.goto(base + "/app/cards/" + cardId);
      await other
        .getByRole("heading", { name: /Créons votre PopCard/ })
        .waitFor();
      await information(other);
      await page
        .getByLabel("Prénom", { exact: true })
        .fill("Onglet prioritaire");
      await waitServer(
        cardId,
        (c) => c.data.firstName === "Onglet prioritaire",
      );
      await other
        .getByLabel("Prénom", { exact: true })
        .fill("Autre version locale");
      await other
        .locator(".save-status-pill")
        .filter({ hasText: "Conflit de modification" })
        .waitFor();
      assert.equal(
        (await call("cards/" + cardId)).body.data.firstName,
        "Onglet prioritaire",
      );
      assert.equal(
        await other.getByLabel("Prénom", { exact: true }).inputValue(),
        "Autre version locale",
      );
      await other
        .getByRole("button", {
          name: "Charger la version enregistrée",
          exact: true,
        })
        .click();
      await other
        .locator(".save-status-pill")
        .filter({ hasText: "Enregistré" })
        .waitFor();
      await other.close();
    },
  );
  await check(
    "Email incomplet : erreur explicite, correction puis reprise de sauvegarde",
    async () => {
      await editor(cardId);
      await information();
      await page
        .getByLabel("E-mail", { exact: true })
        .first()
        .fill("adresse-incomplete");
      await page
        .locator(".save-status-pill")
        .filter({ hasText: "À synchroniser" })
        .waitFor();
      await page
        .getByLabel("E-mail", { exact: true })
        .first()
        .fill("contact@example.com");
      await waitServer(
        cardId,
        (c) => c.data.emails[0] === "contact@example.com",
      );
    },
  );
  await check(
    "Imports réels PNG, JPEG et PDF multipage ; détourage et tolérance absents",
    async () => {
      await page.getByRole("button", { name: /2 Identité visuelle/ }).click();
      for (const ext of ["png", "jpg", "pdf"]) {
        await page
          .getByLabel(/Votre logo/)
          .setInputFiles("tests/fixtures/logo." + ext);
        await page
          .getByRole("heading", { name: "Choisissez une palette complète" })
          .waitFor();
        await page.waitForFunction(
          () =>
            !document.querySelector(".logo-studio input[type=file]").disabled,
        );
      }
      await page.getByLabel("Page du PDF", { exact: true }).selectOption("2");
      await page.waitForFunction(
        () => !document.querySelector(".logo-studio input[type=file]").disabled,
      );
      assert.equal(
        await page
          .getByText(
            /tolérance|Rendre le fond uni transparent|supprimer l.arrière.plan/i,
          )
          .count(),
        0,
      );
      assert.ok((await call("cards/" + cardId)).body.logo_id);
    },
  );
  await check(
    "SVG actif : nettoyage du script et des références externes",
    async () => {
      await page
        .getByLabel(/Votre logo/)
        .setInputFiles({
          name: "logo.svg",
          mimeType: "image/svg+xml",
          buffer: Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="100"><script>window.__svgAttack=true</script><rect width="220" height="100" fill="#1c2c46"/><circle cx="110" cy="50" r="25" fill="#1d9878"/></svg>',
          ),
        });
      await page.waitForFunction(
        () => !document.querySelector(".logo-studio input[type=file]").disabled,
      );
      assert.equal(await page.evaluate(() => window.__svgAttack), undefined);
      assert.equal(await page.locator(".logo-studio [role=alert]").count(), 0);
    },
  );
  await check(
    "Fichier trop volumineux et format invalide : rejet sans bloquer la page",
    async () => {
      await page
        .getByLabel(/Votre logo/)
        .setInputFiles({
          name: "trop-gros.png",
          mimeType: "image/png",
          buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
        });
      await page
        .getByRole("alert")
        .filter({ hasText: "10 Mo maximum" })
        .waitFor();
      await page
        .getByLabel(/Votre logo/)
        .setInputFiles({
          name: "invalide.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("test"),
        });
      await page
        .getByRole("alert")
        .filter({ hasText: /Choisissez un PNG/ })
        .waitFor();
      await page.getByRole("button", { name: /3 Informations/ }).click();
      await page.getByLabel("Nom", { exact: true }).fill("Page réactive");
      await waitServer(cardId, (c) => c.data.lastName === "Page réactive");
    },
  );
  await check(
    "Aperçu email privé : lien généré par le vrai backend local",
    async () => {
      await page
        .getByRole("button", {
          name: "Envoyer mon aperçu par email",
          exact: true,
        })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: /Aperçu enregistré dans le journal/ })
        .waitFor();
      const count = await db.query(
        "SELECT count(*) FROM mail_outbox WHERE recipient='qa@example.com' AND body LIKE '%/apercu?token=%'",
      );
      assert.ok(Number(count.rows[0].count) > 0);
    },
  );
  await check(
    "Mini-site : quatre actions, fiche vCard et liens issus des saisies",
    async () => {
      await page
        .getByRole("textbox", { name: "WhatsApp", exact: true })
        .fill("+212600000000");
      await page
        .getByLabel("Site web · URL https://")
        .fill("https://example.com");
      await page
        .getByRole("button", { name: "Mini-site", exact: true })
        .click();
      assert.equal(await page.locator(".reference-mini .ms-btn").count(), 4);
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Enregistrer le contact", exact: true })
        .click();
      const file = await download;
      assert.match(file.suggestedFilename(), /\.vcf$/);
    },
  );
  await check(
    "Éditeur responsive : mobile et tablette sans débordement",
    async () => {
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Éditeur dépasse à " + width,
        );
      }
      await page.screenshot({
        path: "tests/screenshots/editor-1440.png",
        fullPage: true,
      });
    },
  );
  await check(
    "Stockage local saturé : avertissement et sauvegarde serveur maintenue",
    async () => {
      await editor(cardId);
      await information();
      await page.evaluate(() => {
        window.qaSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function () {
          throw new DOMException("QuotaExceeded", "QuotaExceededError");
        };
      });
      try {
        await page.getByLabel("Prénom", { exact: true }).fill("Quota géré");
        await waitServer(cardId, (c) => c.data.firstName === "Quota géré");
        await page
          .getByRole("status")
          .filter({ hasText: /récupération sur cet appareil est indisponible/ })
          .waitFor();
      } finally {
        await page.evaluate(() => {
          Storage.prototype.setItem = window.qaSetItem;
        });
      }
    },
  );
  await check(
    "Brouillon local corrompu : création toujours utilisable",
    async () => {
      const me = (await call("me")).body;
      const count = (await cards()).length;
      await page.evaluate(
        (userId) =>
          localStorage.setItem(
            "popcard:draft:v3:" + userId + ":new",
            "{illisible",
          ),
        me.id,
      );
      await editor("new");
      assert.equal((await cards()).length, count);
    },
  );
  await check(
    "Grand logo : analyse fluide sans longue tâche bloquante",
    async () => {
      await editor(cardId);
      await page.getByRole("button", { name: /2 Identité visuelle/ }).click();
      await page.evaluate(() => {
        window.qaTasks = [];
        window.qaObserver = new PerformanceObserver((list) =>
          window.qaTasks.push(...list.getEntries().map((e) => e.duration)),
        );
        window.qaObserver.observe({ type: "longtask", buffered: false });
      });
      await page
        .getByLabel(/Votre logo/)
        .setInputFiles({
          name: "grand-logo.svg",
          mimeType: "image/svg+xml",
          buffer: Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1400"><rect width="1400" height="1400" fill="#ffffff"/><circle cx="700" cy="700" r="500" fill="#173e35"/></svg>',
          ),
        });
      await page.waitForFunction(
        () => !document.querySelector(".logo-studio input[type=file]").disabled,
      );
      const longest = await page.evaluate(() => {
        window.qaObserver.disconnect();
        return Math.max(0, ...window.qaTasks);
      });
      assert.ok(
        longest < 600,
        "Tâche principale trop longue : " + longest + " ms",
      );
    },
  );
  await check(
    "Impression : deux faces Signature aux dimensions exactes",
    async () => {
      const me = (await call("me")).body,
        original = (await call("cards/" + cardId)).body;
      const card = (await call("cards", { ...original.data, designVersion: 2 }))
        .body;
      const id = crypto.randomUUID();
      await db.query(
        "INSERT INTO orders(id,user_id,card_id,reference,status,quantity,amount,shipping,snapshot,billing,delivery,rights_at,paid_at) VALUES($1,$2,$3,'QA-PRINT','verified',1,400,0,$4,'{}','{}',now(),now())",
        [id, me.id, card.id, { ...card.data, logo_id: card.logo_id }],
      );
      await page.goto(base + "/production/" + id);
      await page.locator(".production-faces .ref-card").first().waitFor();
      await page.emulateMedia({ media: "print" });
      try {
        assert.equal(
          await page.locator(".production-faces .signature-recto").count(),
          1,
        );
        for (const el of await page
          .locator(".production-faces .ref-card")
          .all()) {
          const box = await el.boundingBox();
          assert.ok(Math.abs(box.width - (85.6 * 96) / 25.4) < 1);
          assert.ok(Math.abs(box.height - (54 * 96) / 25.4) < 1);
        }
      } finally {
        await page.emulateMedia({ media: "screen" });
      }
    },
  );
  await check(
    "Version du modèle préservée pour une carte ancienne",
    async () => {
      const data = { ...(await call("cards/" + cardId)).body.data };
      delete data.designVersion;
      const legacy = await call("cards", data);
      assert.equal(legacy.body.data.designVersion, 1);
      await editor(legacy.body.id);
      assert.equal(await page.locator(".ref-card.version-1").count(), 1);
      await page
        .getByRole("button", { name: /Signature Une composition/ })
        .click();
      await page.locator(".ref-card.version-2").waitFor();
      await waitServer(legacy.body.id, (c) => c.data.designVersion === 2);
    },
  );
  await check(
    "Isolation : un autre compte ne lit ni carte ni récupération locale",
    async () => {
      await call("auth/logout", {});
      await call("auth/register", {
        name: "Autre compte",
        email: "autre-qa@example.com",
        password: "TestPassword123",
        confirmation: "TestPassword123",
        terms: true,
      });
      assert.equal((await call("cards/" + cardId)).status, 404);
      await page.goto(base + "/app/cards/" + cardId);
      await page
        .getByRole("heading", { name: "Le brouillon n’a pas pu être chargé." })
        .waitFor();
      assert.equal(await page.getByLabel("Prénom", { exact: true }).count(), 0);
    },
  );
  await check(
    "Aucune erreur JavaScript ni violation CSP dans les parcours",
    async () => assert.deepEqual(errors, []),
  );
} catch (e) {
  results.push({
    name: "Infrastructure ou dépendance de scénario",
    status: "fail",
    error: e.stack,
  });
  console.error(e.stack);
} finally {
  await writeFile(
    "tests/qa-results.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks: results.length,
        passed: results.filter((r) => r.status === "pass").length,
        failed: results.filter((r) => r.status === "fail").length,
        results,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  await db?.end().catch(() => {});
  for (const child of children) child.kill("SIGTERM");
}
console.log(
  `Recette navigateur : ${results.filter((r) => r.status === "pass").length}/${results.length} contrôles réussis.`,
);
if (results.some((r) => r.status === "fail")) process.exitCode = 1;
