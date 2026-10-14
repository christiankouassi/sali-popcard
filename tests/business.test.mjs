import test from "node:test";
import assert from "node:assert/strict";
import { price, canPublish, transitions, safeUrl } from "../lib/business.mjs";
test("Tarifs de première commande et exemplaires supplémentaires", () => {
  assert.equal(price(1), 400);
  assert.equal(price(2), 650);
  assert.equal(price(50), 400 + 49 * 225);
  assert.equal(price(100), 400 + 99 * 200);
  assert.equal(price(1, true, 30), 280);
  assert.throws(() => price(0));
  assert.throws(() => price(1.5));
  assert.throws(() => price(501));
});
test("Le paiement seul ne publie pas le mini-site", () => {
  assert.equal(canPublish("verified"), false);
  assert.equal(canPublish("production"), false);
  assert.equal(canPublish("shipped"), true);
  assert.equal(canPublish("delivered"), true);
});
test("La production ne peut pas sauter la vérification du paiement", () => {
  assert.deepEqual(transitions.review, ["verified", "rejected"]);
  assert.deepEqual(transitions.verified, ["production"]);
  assert.deepEqual(transitions.production, ["shipped"]);
  assert.deepEqual(transitions.delivered, []);
});
test("Les liens exécutables sont refusés", () => {
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("data:text/html,test"), undefined);
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
});
