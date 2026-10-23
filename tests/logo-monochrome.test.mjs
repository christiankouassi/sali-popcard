import test from "node:test";
import assert from "node:assert/strict";
import { monochromeLogoStyle } from "../lib/logo-monochrome.mjs";
function sample(background, foreground) {
  const p = new Uint8ClampedArray(4 * 8 * 8);
  for (let i = 0; i < 64; i++) p.set(background, i * 4);
  for (const i of [27, 28, 35, 36]) p.set(foreground, i * 4);
  return p;
}
test("Un logo opaque sombre sur blanc garde ses lettres en version blanche", () => {
  const style = monochromeLogoStyle(
    sample([255, 255, 255, 255], [0, 0, 0, 255]),
    8,
    8,
  );
  assert.match(style.filter, /invert\(1\)/);
  assert.equal(style.mixBlendMode, "screen");
});
test("Un logo clair sur fond sombre retire son fond sans inverser ses lettres", () => {
  const style = monochromeLogoStyle(
    sample([23, 62, 53, 255], [255, 255, 255, 255]),
    8,
    8,
  );
  assert.ok(!style.filter.includes("invert"));
  assert.equal(style.mixBlendMode, "screen");
});
test("Le logo transparent conserve exactement son masque alpha", () => {
  assert.deepEqual(
    monochromeLogoStyle(sample([0, 0, 0, 0], [23, 62, 53, 255]), 8, 8),
    { filter: "brightness(0) invert(1)" },
  );
});
