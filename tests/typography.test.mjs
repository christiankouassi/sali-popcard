import test from "node:test";
import assert from "node:assert/strict";
import { brandFont, supportsMoontime } from "../lib/typography.mjs";

test("Moontime prend en charge les phrases décoratives et les noms sans accents", () => {
  for (const text of ["En un scan.", "sa signature.", "le contact ?", "Nadia Bennani"]) {
    assert.equal(supportsMoontime(text), true);
    assert.match(brandFont("Moontime", text), /^Moontime,/);
  }
});

test("Les accents et noms non couverts conservent une police homogène et leur texte", () => {
  for (const text of ["Émilie Bénali", "À vous de jouer.", "François", "محمد"]) {
    assert.equal(supportsMoontime(text), false);
    assert.equal(brandFont("Moontime", text), "Montserrat, sans-serif");
  }
});

test("Les anciennes familles ne réintroduisent pas une police hors charte", () => {
  for (const family of ["Open Sans", "Poppins", "Cormorant Garamond", "Montserrat"]) {
    assert.equal(brandFont(family, "Nadia"), "Montserrat, sans-serif");
  }
});
