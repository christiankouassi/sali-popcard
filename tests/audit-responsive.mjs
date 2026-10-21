// Audit responsive : chaque écran, six largeurs, détection automatique des
// débordements, textes coupés, éléments recouverts, contrastes illisibles,
// images cassées et erreurs console. Base PGlite isolée, aucun e-mail envoyé.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import pg from "pg";
import { randomUUID } from "node:crypto";

const base = "http://localhost:3000";
const out = "tests/audit";
const widths = (process.env.AUDIT_WIDTHS || "320,390,768,1024,1440,1920")
  .split(",")
  .map(Number);
const only = process.env.AUDIT_ONLY ? new RegExp(process.env.AUDIT_ONLY) : null;
const children = [];
const launch = (args, env = {}) => {
  const p = spawn(process.execPath, args, {
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, ...env },
  });
  children.push(p);
  return p;
};

class Client {
  cookie = "";
  async call(p, data, expected = 200) {
    const r = await fetch(base + "/api/" + p, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        ...(data === undefined ? {} : { Origin: base }),
        ...(data instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data),
    });
    const c = r.headers.get("set-cookie");
    if (c) this.cookie = c.split(";")[0];
    const body = await r.json();
    if (r.status !== expected) throw Error(p + " → " + r.status + " " + JSON.stringify(body));
    return body;
  }
}

const card = (over = {}) => ({
  tpl: "B",
  primary: "#1C2C46",
  accent: "#1D9878",
  background: "#FFFFFF",
  firstName: "Anne-Charlotte",
  lastName: "Benkirane-Dupont de la Villardière",
  company: "Société Internationale de Développement Commercial et Industriel SARL",
  title: "Directrice générale adjointe chargée des partenariats stratégiques",
  city: "Casablanca",
  desc: "Accompagnement des entreprises marocaines et internationales dans leur transformation numérique, de la stratégie à la mise en œuvre opérationnelle.",
  address: "Tour Crystal 3, Boulevard Sidi Mohammed Ben Abdellah, Casablanca Marina, 20030 Casablanca",
  website: "https://www.une-adresse-de-site-web-tres-longue-pour-tester.example.com/chemin/profond",
  whatsapp: "+212 600 123 456",
  instagram: "https://instagram.com/sali.digicom",
  linkedin: "https://linkedin.com/company/sali-digicom",
  facebook: "https://facebook.com/salidigicom",
  lang: "fr",
  fontTitle: "Montserrat",
  fontBody: "Open Sans",
  phones: [["Mobile", "+212 600 123 456"], ["Bureau", "+212 522 000 000"]],
  emails: ["anne-charlotte.benkirane-dupont@societe-internationale-developpement.example.com"],
  show: { desc: true, phones: true, emails: true, whatsapp: true, website: true, address: true, social: true },
  logoTile: false,
  ...over,
});

// --- Analyse exécutée dans la page ------------------------------------------
const PROBE = () => {
  const vw = document.documentElement.clientWidth;
  const vh = innerHeight;
  const issues = [];
  const push = (type, el, extra = {}) => issues.push({ type, el: el ? desc(el) : "", ...extra });
  const desc = (el) => {
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
    const t = (el.innerText || el.getAttribute?.("alt") || el.value || "").trim().replace(/\s+/g, " ").slice(0, 60);
    return el.tagName.toLowerCase() + cls + (t ? ` "${t}"` : "");
  };
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    if (s.clip === "rect(0px, 0px, 0px, 0px)" || s.clip === "rect(0, 0, 0, 0)") return false;
    return true;
  };
  const hasText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  const inHiddenTree = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) === 0) return true;
      if (a.getAttribute("aria-hidden") === "true") return true;
    }
    return false;
  };
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = (el) => {
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.backgroundImage && s.backgroundImage !== "none") return null; // image/dégradé : non mesurable
      const c = parse(s.backgroundColor);
      if (c && c.a > 0.9) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  if (document.documentElement.scrollWidth > vw + 1)
    push("page-overflow-x", null, { by: document.documentElement.scrollWidth - vw });
  const texts = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(el.tagName)) continue;
    if (!visible(el) || inHiddenTree(el)) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const text = hasText(el);
    const media = ["IMG", "SVG", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"].includes(el.tagName);
    if (el.tagName === "IMG" && el.complete && el.naturalWidth === 0) push("broken-image", el, { src: el.getAttribute("src") });
    if (!(text || media)) continue;
    let scrollable = false, clipper = null;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a);
      if (/(auto|scroll)/.test(as.overflowX + as.overflowY)) { scrollable = true; break; }
      if (/(hidden|clip)/.test(as.overflowX + as.overflowY)) {
        const ar = a.getBoundingClientRect();
        const tol = 2;
        if (r.right > ar.right + tol || r.left < ar.left - tol || r.bottom > ar.bottom + tol || r.top < ar.top - tol) { clipper = a; break; }
      }
    }
    if (!scrollable && (r.right > vw + 1 || r.left < -1)) {
      if (!el.closest("aside.sidebar:not(.open)")) {
        push("offscreen-x", el, { left: Math.round(r.left), right: Math.round(r.right) });
      }
    }
    if (clipper && !scrollable) push("clipped-by-ancestor", el, { by: desc(clipper) });
    if (text && s.display !== "inline") {
      if (el.scrollWidth > el.clientWidth + 1 && /(hidden|clip)/.test(s.overflowX)) {
        if (s.textOverflow !== "ellipsis") {
          push("text-clipped-x", el, { overflow: el.scrollWidth - el.clientWidth });
        }
      }
      if (el.scrollHeight > el.clientHeight + 2 && /(hidden|clip)/.test(s.overflowY)) {
        if (!s.webkitLineClamp || s.webkitLineClamp === "none") {
          push("text-clipped-y", el, { overflow: el.scrollHeight - el.clientHeight });
        }
      }
    }
    if (text) {
      texts.push(el);
      const fg = parse(s.color);
      const bg = bgOf(el);
      if (fg && bg && fg.a > 0.5) {
        const l1 = lum(fg), l2 = lum(bg);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.6 && Number(s.fontWeight) >= 700);
        if (ratio < 1.6) push("invisible-text", el, { ratio: +ratio.toFixed(2), color: s.color });
        else if (ratio < (large ? 3 : 4.5)) push("low-contrast", el, { ratio: +ratio.toFixed(2), size: s.fontSize });
      }
    }
  }
  return { issues, texts: texts.length, height: document.documentElement.scrollHeight };
};

// Éléments textuels recouverts par un autre élément (hors en-têtes fixes/sticky).
const COVER = async (page) => {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  const found = new Map();
  for (let y = 0; y < height; y += Math.floor(vh * 0.8)) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(60);
    const res = await page.evaluate(() => {
      const out = [];
      const fixedish = (el) => {
        for (let a = el; a && a !== document.body; a = a.parentElement) {
          const p = getComputedStyle(a).position;
          if (p === "fixed" || p === "sticky") return true;
        }
        return false;
      };
      const desc = (el) => {
        const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
        return el.tagName.toLowerCase() + cls + ' "' + (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 50) + '"';
      };
      for (const el of document.body.querySelectorAll("*")) {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
        if (el.closest("details:not([open])") && !el.closest("summary")) continue;
        if (el.closest(".card-pair")) continue; // chevauchement décoratif recto/verso
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || s.display === "none" || parseFloat(s.opacity) === 0 || s.pointerEvents === "none") continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 3, r.top + r.height / 2]];
        for (const [x, y] of pts) {
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          const top = document.elementFromPoint(x, y);
          if (!top || top === el || el.contains(top) || top.contains(el)) continue;
          if (fixedish(top) && !fixedish(el)) continue; // contenu qui défile sous un en-tête sticky
          if (getComputedStyle(top).pointerEvents === "none") continue;
          out.push({ el: desc(el), by: desc(top) });
          break;
        }
      }
      return out;
    });
    for (const r of res) found.set(r.el + "|" + r.by, r);
  }
  await page.evaluate(() => scrollTo(0, 0));
  return [...found.values()].map((r) => ({ type: "covered", ...r }));
};

let browser;
const report = [];
try {
  launch(["tests/db-server.mjs"]);
  launch(["dist/server.js"], {
    HOSTNAME: "127.0.0.1",
    PORT: "3000",
    DATABASE_URL: "postgresql://postgres@127.0.0.1:55432/postgres",
    APP_URL: base,
    MAIL_MODE: "log",
    POPCARD_ORDERS_ENABLED: "true",
    POPCARD_BANK_NAME: "Attijariwafa Bank",
    POPCARD_BANK_HOLDER: "SALI DigiCom",
    POPCARD_BANK_RIB: "007780000123456789012345",
    POPCARD_BANK_IBAN: "MA64007780000123456789012345",
    POPCARD_BANK_SWIFT: "BCMAMAMC",
    POPCARD_INVOICE_ENABLED: "true",
    POPCARD_COMPANY_ADDRESS: "Casablanca, Maroc",
    POPCARD_COMPANY_ICE: "000000000000000",
  });
  let ok = false;
  for (let i = 0; i < 80 && !ok; i++) {
    try { ok = (await fetch(base + "/api/config")).ok; } catch {}
    if (!ok) await new Promise((r) => setTimeout(r, 300));
  }
  if (!ok) throw Error("Serveur de test indisponible");
  for (let i = 0; ; i++) {
    const probe = new pg.Client({ connectionString: "postgresql://postgres@127.0.0.1:55432/postgres" });
    try { await probe.connect(); await probe.end(); break; } catch (e) { if (i > 60) throw e; await new Promise((r) => setTimeout(r, 300)); }
  }
  await new Promise((r) => setTimeout(r, 800));

  // --- Données de démonstration -------------------------------------------
  const client = new Client(), admin = new Client(), anon = new Client();
  const reg = (c, email, name) => c.call("auth/register", { name, email, password: "TestPassword123", confirmation: "TestPassword123", terms: true });
  await reg(client, "anne-charlotte.benkirane-dupont@societe-internationale-developpement.example.com", "Anne-Charlotte Benkirane-Dupont de la Villardière");
  await reg(admin, "admin@example.com", "Admin SALI");
  const db = new pg.Client({ connectionString: "postgresql://postgres@127.0.0.1:55432/postgres" });
  await db.connect();
  await db.query("UPDATE users SET is_admin=true,verified_at=now() WHERE email='admin@example.com'");
  await db.query("UPDATE users SET verified_at=now() WHERE email LIKE 'anne-charlotte%'");
  const logo = await readFile("tests/fixtures/logo.png");
  const withLogo = async (c) => {
    const f = new FormData();
    f.set("file", new Blob([logo], { type: "image/png" }), "logo.png");
    await client.call("cards/" + c.id + "/logo", f);
  };
  const cA = await client.call("cards", card({ tpl: "A", primary: "#1D9878", accent: "#1C2C46" }));
  await withLogo(cA);
  const cB = await client.call("cards", card({ tpl: "B" }));
  await withLogo(cB);
  const cC = await client.call("cards", card({ tpl: "C", lang: "en", fontTitle: "Cormorant Garamond", fontBody: "Poppins" }));
  const order = (id) => ({ card_id: id, quantity: 120, billing_type: "company", billing_name: "Société Internationale de Développement Commercial et Industriel SARL", ice: "123456789012345", country: "Côte d’Ivoire", address: "Tour Crystal 3, Boulevard Sidi Mohammed Ben Abdellah, Casablanca Marina, 20030 Casablanca", rights: true, terms: true });
  const oA = await client.call("orders", order(cA.id));
  const oB = await client.call("orders", order(cB.id));
  const rf = new FormData();
  rf.set("file", new Blob(["%PDF-1.4\nreçu"], { type: "application/pdf" }), "recu.pdf");
  await client.call("orders/" + oB.id + "/receipt", rf);
  for (const status of ["verified", "production", "shipped"])
    await admin.call("admin/orders/" + oB.id, { status, note: status === "shipped" ? "Votre colis est parti ce matin avec Amana, livraison estimée sous 48 heures." : "", tracking: status === "shipped" ? "AMANA-RR123456789MA" : "", bank_confirmed: true, rights_confirmed: true });
  const share = await client.call("cards/" + cC.id + "/share-preview", {});
  const previewToken = new URL(share.url).searchParams.get("token");
  const resetMail = await client.call("auth/forgot", { email: "anne-charlotte.benkirane-dupont@societe-internationale-developpement.example.com" });
  void resetMail;
  const freshCard = (await db.query("SELECT slug FROM cards WHERE id=$1", [cB.id])).rows[0];
  await db.end();
  const sessionCookie = (c) => [{ name: "popcard_session", value: c.cookie.split("=")[1], domain: "localhost", path: "/" }];

  // --- Écrans --------------------------------------------------------------
  const screens = [
    { name: "landing", url: "/" },
    { name: "connexion", url: "/connexion" },
    { name: "inscription", url: "/inscription" },
    { name: "mdp-oublie", url: "/mot-de-passe-oublie" },
    { name: "reinitialisation", url: "/reinitialisation?token=" + "a".repeat(64) },
    { name: "verification", url: "/verification?token=" + "b".repeat(64) },
    { name: "conditions", url: "/conditions" },
    { name: "app-deconnecte", url: "/app" },
    { name: "apercu-partage", url: "/apercu?token=" + previewToken },
    { name: "apercu-invalide", url: "/apercu?token=zzz" },
    { name: "minisite-public", url: "/p/" + freshCard.slug },
    { name: "minisite-404", url: "/p/inexistant" },
    { name: "dashboard", url: "/app", as: client },
    { name: "mes-cartes", url: "/app/cards", as: client },
    { name: "editeur-etape1", url: "/app/cards/new", as: client },
    { name: "editeur-etape2", url: "/app/cards/" + cC.id, as: client, step: /2 Identité visuelle/ },
    { name: "editeur-etape3", url: "/app/cards/" + cC.id, as: client, step: /3 Informations/ },
    { name: "editeur-etape4-minisite", url: "/app/cards/" + cC.id, as: client, step: /4 Aperçu/, tab: "Mini-site" },
    { name: "editeur-verso", url: "/app/cards/" + cC.id, as: client, tab: "verso" },
    { name: "editeur-verrouille", url: "/app/cards/" + cB.id, as: client, step: /2 Identité visuelle/ },
    { name: "commande-form", url: "/app/cards/" + cC.id + "/checkout", as: client },
    { name: "mes-commandes", url: "/app/orders", as: client },
    { name: "commande-virement", url: "/app/orders/" + oA.id, as: client },
    { name: "commande-expediee", url: "/app/orders/" + oB.id, as: client },
    { name: "profil", url: "/app/profile", as: client },
    { name: "compte", url: "/app/account", as: client },
    { name: "aide", url: "/app/help", as: client },
    { name: "menu-mobile", url: "/app", as: client, menu: true, maxWidth: 1023 },
    { name: "admin-commandes", url: "/app/admin", as: admin },
    { name: "admin-traiter", url: "/app/admin", as: admin, treat: true },
    { name: "admin-cartes", url: "/app/admin", as: admin, adminTab: "PopCards" },
    { name: "admin-clients", url: "/app/admin", as: admin, adminTab: "Clients" },
    { name: "admin-emails", url: "/app/admin", as: admin, adminTab: "Journal des emails" },
    { name: "production", url: "/production/" + oB.id, as: admin },
  ].filter((s) => !only || only.test(s.name));

  if (!process.env.AUDIT_KEEP) await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const s of screens) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (s.as) await context.addCookies(sessionCookie(s.as));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => {
      if (m.type() === "error") {
        const text = m.text();
        if (/status of (401|404)/.test(text)) return;
        if (/401|404/.test(text) && /\/api\/(me|public\/inexistant|preview\/zzz)/.test(text)) return;
        errors.push("console: " + text.slice(0, 200));
      }
    });
    page.on("response", (r) => {
      const u = r.url();
      if (r.status() >= 400 && !/\/api\/(me|public\/inexistant|preview\/zzz)/.test(u)) errors.push(r.status() + " " + u.replace(base, ""));
    });
    for (const width of widths) {
      if (s.maxWidth && width > s.maxWidth) continue;
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      await page.goto(base + s.url, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      if (s.step) await page.getByRole("button", { name: s.step }).click();
      if (s.tab) await page.locator(".previewtabs button", { hasText: new RegExp("^" + s.tab + "$", "i") }).click();
      if (s.adminTab) { await page.getByRole("button", { name: s.adminTab, exact: true }).click(); await page.waitForLoadState("networkidle"); }
      if (s.treat) { await page.getByRole("button", { name: /Traiter/ }).first().click(); }
      if (s.menu) await page.getByRole("button", { name: /Menu/ }).click();
      await page.waitForTimeout(250);
      const probe = await page.evaluate(PROBE);
      const covered = s.menu ? [] : await COVER(page);
      const file = `${out}/${s.name}-${width}.png`;
      await page.screenshot({ path: file, fullPage: true });
      report.push({ screen: s.name, width, height: probe.height, issues: [...probe.issues, ...covered] });
    }
    report.push({ screen: s.name, width: "all", errors: [...new Set(errors)] });
    await context.close();
    // Sauvegarde après chaque écran : un arrêt brutal ne perd rien.
    await writeFile(`${out}/report-${s.name}.json`, JSON.stringify(report.filter((r) => r.screen === s.name), null, 1));
  }
  await writeFile(out + "/report.json", JSON.stringify(report, null, 1));
  // Résumé lisible
  const summary = {};
  for (const r of report) {
    if (r.errors?.length) (summary[r.screen] ??= []).push(...r.errors.map((e) => "ERREUR " + e));
    for (const i of r.issues || []) {
      const key = `${i.type} ${i.el}${i.by ? " ⟵ " + i.by : ""}${i.ratio ? " ratio " + i.ratio : ""}`;
      (summary[r.screen] ??= []).push(key + " @" + r.width);
    }
  }
  const merged = {};
  for (const [screen, list] of Object.entries(summary)) {
    const m = new Map();
    for (const l of list) {
      const [k, w] = l.includes(" @") ? [l.slice(0, l.lastIndexOf(" @")), l.slice(l.lastIndexOf(" @") + 2)] : [l, ""];
      m.set(k, [...(m.get(k) || []), w].filter(Boolean));
    }
    merged[screen] = [...m].map(([k, ws]) => k + (ws.length ? "  [" + [...new Set(ws)].join(",") + "]" : ""));
  }
  await writeFile(out + "/summary.json", JSON.stringify(merged, null, 1));
  const count = Object.values(merged).reduce((n, l) => n + l.length, 0);
  console.log(JSON.stringify(merged, null, 1));
  console.log(`\nAUDIT : ${screens.length} écrans × ${widths.length} largeurs, ${count} constats distincts.`);
} finally {
  await browser?.close();
  for (const p of children) p.kill("SIGTERM");
}
