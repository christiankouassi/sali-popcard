import test from "node:test";
import assert from "node:assert/strict";
import { clientId } from "../lib/client-id.mjs";
test("L’éditeur dispose d’un UUID valide même en contexte HTTP", () => {
  const id = clientId({
    getRandomValues: (bytes) => {
      bytes.fill(42);
      return bytes;
    },
  });
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});
test("Le navigateur sécurisé conserve son générateur natif", () => {
  assert.equal(clientId({ randomUUID: () => "natif" }), "natif");
  assert.notEqual(clientId(), clientId());
});
