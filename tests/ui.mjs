import { chromium as playwright } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir,readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import pg from "pg";
import {randomUUID} from "node:crypto";
const children = [];
const launch = (args, env = {}) => {
  const p = spawn(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  children.push(p);
  return p;
};
let browser;
try {
  launch(["tests/db-server.mjs"]);
  launch(
    ["dist/server.js"],
    {
      HOSTNAME:"127.0.0.1",
      DATABASE_URL: "postgresql://postgres@127.0.0.1:55432/postgres",
      APP_URL: "http://localhost:3000",
      MAIL_MODE: "log",
    },
  );
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch("http://localhost:3000/api/config")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  await new Promise((r) => setTimeout(r, 1500));
  await mkdir("tests/screenshots", { recursive: true });
  let options = { headless: true };
  if (process.env.USE_SPARTICUZ === "true") {
    const { default: chromium } = await import("@sparticuz/chromium");
    options = {
      headless: true,
      args: chromium.args.filter((a) => a !== "--disable-web-security"),
      executablePath: await chromium.executablePath(),
    };
  }
  browser = await playwright.launch(options);
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000");
  await page.getByRole("heading", { name: /Vos coordonnées/ }).waitFor();
  assert.equal(await page.locator(".landing > section").count(),12);
  assert.equal(await page.locator('.landing .reference-mini .ms-btn').count(),4);
  assert.equal(await page.locator('.landing .reference-mini .ms-sec').count(),5);
  assert.equal(await page.locator('.landing-models .model-B .lines div').count(),4);
  const centered=await page.locator('.landing-models .model-A').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('.initials').getBoundingClientRect();return {x:Math.abs(a.x+a.width/2-b.x-b.width/2),y:Math.abs(a.y+a.height/2-b.y-b.height/2),background:getComputedStyle(el.querySelector('.initials')).backgroundColor};});assert.ok(centered.x<1 && centered.y<1);assert.equal(centered.background,'rgb(255, 255, 255)');
  assert.equal(await page.locator('.landing-models .model-C .tt>span').count(),2);
  assert.ok((await page.locator('.rich-footer img').getAttribute('src')).endsWith('logo-color.svg'));
  assert.equal(await page.locator('.creator-link').getAttribute('href'),'https://www.sali-digicom.com');

  await page.screenshot({
    path: "tests/screenshots/landing-desktop.png",
    fullPage: true,
  });
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});const fit=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);if(!fit)console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('*')).filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+1||r.left< -1}).slice(0,18).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right,text:el.textContent?.slice(0,40)}))));assert.ok(fit,'Landing dépasse à '+width+'px');}
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "tests/screenshots/landing-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Landing dépasse sur mobile",
  );
  await page.goto("http://localhost:3000/inscription");
  await page.getByLabel("Nom complet").fill("Test navigation");
  await page.getByLabel("Adresse e-mail").fill("ui@example.com");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("PasswordTest123");
  await page.getByLabel("Confirmer le mot de passe").fill("PasswordTest123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await page.waitForURL("**/app");
  await page
    .getByRole("heading", { name: "Tout commence par une rencontre." })
    .waitFor();
  await page.screenshot({
    path: "tests/screenshots/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "+ Créer une PopCard" }).click();
  await page.getByRole("heading", { name: "Créons votre PopCard." }).waitFor();
  await page.getByRole('button',{name:'Mini-site',exact:true}).click();
  await page.locator('.reference-mini .ms-name').filter({hasText:'Nom complet'}).waitFor();
  assert.equal(await page.locator('.reference-mini .ms-btn').count(),4);
  assert.equal(await page.locator('.reference-mini .ms-sec').count(),5);
  assert.equal(await page.getByRole('button',{name:'WhatsApp',exact:true}).isDisabled(),true);
  assert.equal(await page.locator('.reference-mini .logo-placeholder').textContent(),'Logo');
  await page.getByRole("button", { name: /2 Identité visuelle/ }).click();
  assert.equal(await page.locator('input[type="file"]').count(),1);
  for(const ext of ['png','jpg','pdf']){
    await page.getByLabel(/Votre logo/).setInputFiles('tests/fixtures/logo.'+ext);
    await page.getByRole('heading',{name:'Choisissez une palette complète'}).waitFor();
    if(ext==='pdf'){await page.getByLabel('Page du PDF').selectOption('2');await page.waitForTimeout(300);}
    await page.waitForFunction(()=>!document.querySelector('.logo-studio input[type=file]').disabled);
    assert.equal(await page.locator('.logo-studio [role="alert"]').count(),0);
  }
  await page.getByLabel(/Votre logo/).setInputFiles({name:'logo.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="white"/><rect x="40" y="20" width="120" height="60" fill="#1c2c46"/><circle cx="100" cy="50" r="15" fill="#1d9878"/></svg>')});
  await page.getByRole('heading',{name:'Choisissez une palette complète'}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.logo-studio input[type=file]').disabled);
  await page.getByRole('button',{name:/Couleurs du logo/}).click();
  const palette=await page.locator('input[type="color"]').evaluateAll(els=>els.map(e=>e.value));
  assert.equal(palette.length,3);
  await page.getByLabel('Rendre le fond uni transparent').check();
  await page.waitForFunction(()=>!document.querySelector('.logo-studio input[type=file]').disabled);
  const alpha=await page.getByAltText('Logo utilisé').evaluate(async img=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,1,1).data[3];});
  assert.equal(alpha,0);
  await page.getByLabel('Rendre le fond uni transparent').uncheck();
  await page.getByRole("button", { name: /3 Informations/ }).click();
  await page.getByLabel("Prénom", { exact: true }).fill("Christian");
  await page.getByLabel("Nom", { exact: true }).fill("Kouassi");
  await page.getByRole('textbox',{name:'WhatsApp',exact:true}).fill('+212 600 123 456');
  await page.getByRole('link',{name:'WhatsApp',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'WhatsApp',exact:true}).getAttribute('href'),'https://wa.me/212600123456');
  await page.getByLabel('Site web · URL https://').fill('https://example.com');
  await page.getByRole('link',{name:'Site web',exact:true}).waitFor();
  assert.equal(await page.locator('.reference-mini .ms-name').textContent(),'Christian Kouassi');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Enregistrer le contact'}).click();const download=await downloadPromise;const vcard=await readFile(await download.path(),'utf8');assert.ok(vcard.includes('FN:Christian Kouassi'));assert.ok(vcard.includes('URL:https://example.com/'));assert.ok(!vcard.includes('contact@entreprise.ma'));


  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Brouillon enregistré." })
    .waitFor();
  await page.getByRole('button',{name:'Envoyer mon aperçu par email'}).click();
  await page.getByRole('status').filter({hasText:/Aperçu enregistré dans le journal/}).waitFor();
  await page.getByRole("button", { name: "Mini-site", exact: true }).click();
  await page.screenshot({
    path: "tests/screenshots/editor-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Éditeur dépasse sur mobile",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  const action=await page.getByRole("button",{name:"Enregistrer le contact"}).boundingBox();
  assert.ok(action.width>100 && action.height<100,"Bouton contact tronqué");
  await page.screenshot({
    path: "tests/screenshots/editor-desktop.png",
    fullPage: true,
  });
  const db=new pg.Client({connectionString:'postgresql://postgres@127.0.0.1:55432/postgres'});await db.connect();
  const customer=(await db.query("UPDATE users SET is_admin=true,verified_at=now() WHERE email='ui@example.com' RETURNING id")).rows[0];
  const card=(await db.query('SELECT * FROM cards WHERE user_id=$1',[customer.id])).rows[0];
  assert.equal(card.data.emails[0],'');assert.equal(card.data.phones[0][1],'');assert.equal(card.data.whatsapp,'+212 600 123 456');
  const order=randomUUID();await db.query("INSERT INTO orders(id,user_id,card_id,reference,status,quantity,amount,shipping,snapshot,billing,delivery,rights_at,paid_at) VALUES($1,$2,$3,'PC-PRINT-TEST','verified',1,400,0,$4,'{}','{}',now(),now())",[order,customer.id,card.id,{...card.data,logo_id:card.logo_id}]);await db.end();
  await page.goto('http://localhost:3000/production/'+order);await page.locator('.production-faces .ref-card').first().waitFor();
  await page.emulateMedia({media:'print'});
  const printed=await page.locator('.production-faces .ref-card').first().boundingBox();
  assert.ok(Math.abs(printed.width-85.6*96/25.4)<1);assert.ok(Math.abs(printed.height-54*96/25.4)<1);
  const margin=await page.locator('.production-faces .ref-card').first().evaluate(el=>getComputedStyle(el).margin);assert.equal(margin,'0px');
  assert.deepEqual(errors, []);
  console.log(
    "PASS : navigation React, inscription navigateur, session, brouillon, imports PNG/JPEG/SVG/PDF, palettes, transparence, aperçu email, affichage mobile et format d’impression.",
  );
} finally {
  await browser?.close();
  for (const p of children) p.kill("SIGTERM");
}
