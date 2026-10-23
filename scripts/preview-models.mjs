// Review sheet built from the actual card renderer and styles, with demo data.
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
await build({
  entryPoints: ["components/Preview.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "tests/.preview-test.mjs",
  packages: "external",
  alias: { "@/lib": "./lib" },
  loader: { ".css": "empty" },
});
const { CardPreview, defaults } = await import("../tests/.preview-test.mjs");
const asset = async (name) =>
  "data:image/svg+xml;base64," +
  (await readFile("public/assets/" + name)).toString("base64");
const mono = await asset("logo-white-crop.svg"),
  color = await asset("logo-color.svg");
let fonts = "";
for (const weight of [400, 500, 600, 700, 800])
  fonts += `@font-face{font-family:Montserrat;font-style:normal;font-weight:${weight};src:url(data:font/ttf;base64,${(await readFile(`public/assets/montserrat-${weight}.ttf`)).toString("base64")})}`;
fonts += `@font-face{font-family:Moontime;font-style:normal;font-weight:400;src:url(data:font/woff;base64,${(await readFile("public/assets/moontime-400.woff")).toString("base64")})}`;
const reference = await readFile("components/reference.css", "utf8");
const redesign = await readFile("app/redesign.css", "utf8");
const signature = redesign.slice(
  redesign.indexOf("/* The Signature composition"),
  redesign.indexOf("/* A stable shell"),
);
const sample = {
  ...defaults,
  firstName: "Nadia",
  lastName: "Bennani",
  company: "SALI DigiCom",
  title: "Direction commerciale",
  phones: [["Mobile", "+212 600 000 000"]],
  emails: ["contact@exemple.ma"],
  city: "Casablanca",
  website: "https://exemple.ma",
};
const models = [
  ["A", "Essentiel"],
  ["B", "Signature"],
  ["C", "Studio"],
];
const cards = models
  .map(
    ([tpl, name]) =>
      `<section><h2>${name}</h2>${["recto", "verso"].map((side) => `<p class="face-label">${side === "recto" ? "Recto" : "Verso"}</p>${renderToStaticMarkup(React.createElement(CardPreview, { data: { ...sample, tpl }, side, logo: side === "recto" && tpl !== "C" ? mono : color, url: "https://example.com/popcard-demo", watermark: false }))}`).join("")}</section>`,
  )
  .join("");
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PopCard · Proposition des modèles</title><style>${fonts}${reference}${signature}*{box-sizing:border-box}body{margin:0;padding:28px;background:#f7f8f2;color:#173e35;font:14px Montserrat,sans-serif}header,.models,footer{max-width:1280px;margin:auto}header{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:26px}h1{font-size:28px;letter-spacing:-1px;margin:0 0 6px}header p,footer{color:#61756b;font-size:11px;margin-top:6px}h2{font-size:19px;margin:0 0 16px}.models{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}.face-label{text-transform:uppercase;font-size:9px;letter-spacing:2px;margin:18px 0 9px}.ref-card{box-shadow:0 4px 22px #173e3518}footer{margin-top:25px;line-height:1.7}@media(max-width:850px){.models{grid-template-columns:1fr;max-width:520px}header{display:block}body{padding:20px}h1{font-size:24px}section{margin-bottom:22px}}@media print{@page{size:A4 landscape;margin:10mm}body{padding:0}header{margin-bottom:12px}h1{font-size:20px}.models{gap:5mm}h2{margin-bottom:4px}.face-label{margin-top:10px}.ref-card{box-shadow:none}footer{margin-top:10px}section{break-inside:avoid}}</style></head><body><header><div><h1>Trois modèles. Votre identité.</h1><p>PopCard · SALI DigiCom — proposition des modèles</p></div><p>Format de carte : 85,6 × 54 mm</p></header><main class="models">${cards}</main><footer>Données de démonstration · Montserrat + Moontime · Les QR codes de cette planche ouvrent une adresse d’exemple.</footer></body></html>`;
const out = resolve(
  process.argv[2] || "tests/screenshots/proposition-modeles.html",
);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(out);
