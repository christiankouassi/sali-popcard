import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  cardIssues,
  validFont,
  customFontId,
} from "../lib/card-validation.mjs";
import { cardFont, fontCSS, matchFontNames } from "../lib/client-fonts.mjs";
import { fontCatalog } from "../lib/font-catalog.mjs";
const complete = {
  tpl: "B",
  primary: "#173E35",
  accent: "#44B68A",
  background: "#FCFBF6",
  fontTitle: "Poppins",
  fontBody: "Lora",
  firstName: "Nadia",
  lastName: "Bennani",
  company: "",
  lang: "fr",
  phones: [["Mobile", "+212 600 000 000"]],
  emails: [""],
  show: { phones: true },
  whatsapp: "",
  website: "",
  instagram: "",
  linkedin: "",
  facebook: "",
};
test("Les limites de longueur sont également contrôlées avant de changer d’étape", () => {
  assert.ok(
    cardIssues({ ...complete, firstName: "a".repeat(101) }).some(
      (issue) => issue.field === "firstName",
    ),
  );
  assert.deepEqual(cardIssues({ ...complete, firstName: "a".repeat(100) }), []);
  assert.ok(
    cardIssues({ ...complete, desc: "a".repeat(2001) }).some(
      (issue) => issue.field === "desc",
    ),
  );
});
test("Un brouillon incomplet fournit des erreurs ciblées sur les bonnes étapes", () => {
  const issues = cardIssues({});
  assert.ok(issues.some((i) => i.step === 0));
  assert.ok(issues.some((i) => i.step === 1));
  assert.ok(issues.some((i) => i.step === 2 && i.field === "firstName"));
  assert.ok(issues.some((i) => i.field === "contact"));
});
test("Un nom ou une société et un contact visible suffisent", () => {
  assert.deepEqual(cardIssues(complete), []);
  assert.deepEqual(
    cardIssues({
      ...complete,
      firstName: "",
      lastName: "",
      company: "Entreprise test",
    }),
    [],
  );
  assert.ok(
    cardIssues({ ...complete, firstName: "   ", lastName: "" }).some(
      (i) => i.field === "firstName",
    ),
  );
});
test("Essentiel exige un logo, Signature et Studio acceptent des initiales", () => {
  assert.ok(
    cardIssues({ ...complete, tpl: "A" }).some((i) => i.field === "logo"),
  );
  assert.deepEqual(cardIssues({ ...complete, tpl: "A" }, { logo: true }), []);
  assert.deepEqual(cardIssues({ ...complete, tpl: "C" }), []);
});
test("Un contact masqué, vide ou invalide ne permet pas la commande", () => {
  for (const change of [
    { show: {} },
    { phones: [] },
    { phones: [["Mobile", "123"]] },
    { phones: [["Mobile", "<script>"]] },
  ])
    assert.ok(
      cardIssues({ ...complete, ...change }).some((i) => i.field === "contact"),
    );
});
test("Chaque canal visible peut être le contact principal", () => {
  for (const [key, value] of [
    ["emails", ["test@example.com"]],
    ["whatsapp", "+212600000000"],
    ["website", "https://example.com"],
  ])
    assert.deepEqual(
      cardIssues({
        ...complete,
        phones: [],
        [key]: value,
        show: { [key]: true },
      }),
      [],
    );
  assert.deepEqual(
    cardIssues({
      ...complete,
      phones: [],
      instagram: "https://instagram.com/example",
      show: { social: true },
    }),
    [],
  );
});
test("Les erreurs de format facultatives empêchent une commande trompeuse", () => {
  const issues = cardIssues({
    ...complete,
    emails: ["invalide"],
    website: "javascript:alert(1)",
    whatsapp: "123",
    linkedin: "www.example.com",
  });
  assert.deepEqual(issues.map((i) => i.field).sort(), [
    "emails.0",
    "linkedin",
    "website",
    "whatsapp",
  ]);
});
test("Les URL dangereuses et les numéros excessifs sont refusés", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "ftp://example.com",
  ])
    assert.ok(
      cardIssues({ ...complete, website: value }).some(
        (i) => i.field === "website",
      ),
    );
  assert.ok(
    cardIssues({ ...complete, phones: [["Mobile", "1".repeat(16)]] }).some(
      (i) => i.field === "phones.0",
    ),
  );
});
test("La validation de chaque étape inclut les étapes précédentes", () => {
  const issues = cardIssues({
    ...complete,
    tpl: "A",
    firstName: "",
    lastName: "",
    phones: [],
  });
  assert.equal(issues.find((i) => i.step < 2).field, "logo");
  assert.equal(issues.find((i) => i.step < 3).step, 1);
  assert.ok(!cardIssues(complete).some((i) => i.step < 3));
});
test("Une police personnalisée exige un identifiant et son association", () => {
  const id = "01f30f59-0586-48e3-a4ca-bd0625bec929",
    font = "custom:" + id;
  assert.equal(customFontId(font), id);
  assert.equal(validFont("custom:" + "-".repeat(36)), false);
  assert.ok(
    cardIssues({ ...complete, fontTitle: font }).some(
      (i) => i.field === "fontTitle",
    ),
  );
  assert.deepEqual(
    cardIssues({
      ...complete,
      fontTitle: font,
      customFonts: [{ id, family: "Ma police" }],
    }),
    [],
  );
});
test("La bibliothèque fournit 80 familles et leurs fichiers locaux licenciés", async () => {
  assert.equal(fontCatalog.length, 80);
  for (const font of fontCatalog) {
    if (!font.faces.length) continue;
    assert.ok(
      (
        await readFile(
          new URL(
            "../public/fonts/" + font.id + "/LICENSE.txt",
            import.meta.url,
          ),
          "utf8",
        )
      ).length > 100,
    );
    for (const face of font.faces) {
      assert.ok(face.src.startsWith("/fonts/"));
      assert.equal(
        (await readFile(new URL("../public" + face.src, import.meta.url)))
          .subarray(0, 4)
          .toString(),
        "wOF2",
      );
    }
  }
});
test("Les polices clients sont indépendantes de l’identité SALI", () => {
  assert.match(cardFont("Poppins", "Émilie"), /Poppins/);
  assert.match(cardFont("Moontime", "Émilie"), /Montserrat/);
  assert.equal(validFont("Police inconnue"), false);
  assert.match(fontCSS(["Poppins"]), /\/fonts\/poppins/);
  assert.ok(!fontCSS(["Poppins"]).includes("https://"));
});
test("Les noms de polices de fichiers vectoriels sont rapprochés du catalogue", () => {
  const result = matchFontNames([
    "ABCDEF+Poppins-Bold",
    "Montserrat",
    "UnePolicePrivee",
  ]);
  assert.equal(result[0].match.family, "Poppins");
  assert.equal(result[1].match.family, "Montserrat");
  assert.equal(result[2].match, undefined);
});
test("Les polices de l’aperçu privé utilisent des sources contrôlées", () => {
  const id = "01f30f59-0586-48e3-a4ca-bd0625bec929",
    value = "custom:" + id;
  assert.ok(
    fontCSS(
      [value],
      [{ id, previewSource: "https://evil.example/font.woff" }],
    ).includes("/api/fonts/" + id),
  );
  assert.ok(
    fontCSS(
      [value],
      [{ id, weight: "400", previewSource: "data:font/woff2;base64,d09GMg==" }],
    ).includes("data:font/woff2;"),
  );
});
