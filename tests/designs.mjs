import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import jsQR from "jsqr";
import assert from "node:assert/strict";
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
const logo =
  "data:image/png;base64," +
  (
    await sharp({
      create: { width: 120, height: 60, channels: 4, background: "#1c2c46" },
    })
      .png()
      .toBuffer()
  ).toString("base64");
const { StyledQR, CardPreview, MiniSite, defaults } =
  await import("./.preview-test.mjs");
for (const url of [
  "https://popcard.sali-digicom.com/p/abcd123456789012",
  "https://example.com/p/" + "a".repeat(100),
])
  for (const mark of [undefined, logo])
    for (const size of [220, 700])
      for (const colors of [
        ["#1C2C46", "#1D9878"],
        ["#173E35", "#44B68A"],
        ["#FFFFFF", "#FFFF00"],
      ]) {
        const svg = renderToStaticMarkup(
          React.createElement(StyledQR, {
            url,
            primary: colors[0],
            accent: colors[1],
            initials: "SD",
            logo: mark,
          }),
        );
        const { data, info } = await sharp(Buffer.from(svg))
          .resize(size, size)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
        assert.equal(
          code?.data,
          url,
          `QR personnalisé illisible : ${colors.join("/")} à ${size}px, logo=${Boolean(mark)}, URL=${url.length}`,
        );
      }
for (const designVersion of [1, 2])
  for (const tpl of ["A", "B", "C"])
    for (const side of ["recto", "verso"]) {
      const html = renderToStaticMarkup(
        React.createElement(CardPreview, {
          data: {
            ...defaults,
            tpl,
            designVersion,
            firstName: "Nadia",
            lastName: "Bennani",
          },
          side,
        }),
      );
      assert.ok(html.includes(tpl + "-" + side));
      assert.ok(html.includes("APERÇU · POPCARD"));
    }
const mini = renderToStaticMarkup(
  React.createElement(MiniSite, {
    data: {
      ...defaults,
      firstName: "Nadia",
      phones: [["Mobile", "+212600000000"]],
      whatsapp: "212600000000",
      website: "https://example.com",
      emails: ["test@example.com"],
    },
  }),
);
for (const text of [
  "ms-btns",
  "Appeler",
  "WhatsApp",
  "Enregistrer le contact",
  "Site web",
  "Téléphones",
  "E-mails",
  "Créé par",
])
  assert.ok(mini.includes(text), text);
console.log(
  "PASS : douze rendus des modèles (versions 1 et 2), structure du mini-site, vingt-quatre décodages QR (trois palettes, deux tailles, deux URL, avec/sans logo).",
);

const empty = renderToStaticMarkup(
  React.createElement(MiniSite, { data: defaults, placeholders: true }),
);
assert.ok(empty.includes("Nom complet"));
assert.equal((empty.match(/class="ms-btn/g) || []).length, 5);
assert.ok(empty.includes("Logo"));
assert.ok(empty.includes('disabled=""'));
