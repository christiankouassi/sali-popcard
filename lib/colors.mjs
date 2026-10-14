export const hexRgb = (h) =>
  [1, 3, 5].map((i) => {
    const value =
      h.length === 4
        ? "#" +
          h
            .slice(1)
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    return parseInt(value.slice(i, i + 2), 16);
  });
export const rgbHex = (c) =>
  "#" +
  c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
const lum = (h) => {
  const c = hexRgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) =>
  (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
export const onColor = (h) =>
  contrast(h, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#111111";
export function palettes(colors) {
  const ranked = [...new Set(colors)].filter((h) => /^#[a-f0-9]{6}$/i.test(h));
  const first = ranked[0] || "#1C2C46";
  const second =
    ranked.find((h) => h !== first && contrast(h, first) > 1.3) || "#1D9878";
  const dark = (h) => {
    let value = h;
    while (contrast(value, "#FFFFFF") < 4.5)
      value = rgbHex(hexRgb(value).map((v) => v * 0.85));
    return value;
  };
  return [
    {
      name: "Couleurs du logo",
      primary: dark(first),
      accent: second,
      background: "#FFFFFF",
    },
    {
      name: "Couleurs inversées",
      primary: dark(second),
      accent: first,
      background: "#FFFFFF",
    },
    {
      name: "Fond doux",
      primary: dark(first),
      accent: second,
      background: rgbHex(hexRgb(first).map((v) => v * 0.07 + 255 * 0.93)),
    },
    { name: "Sobre", primary: "#1C2C46", accent: first, background: "#FFFFFF" },
  ];
}
export function extractPixelColors(pixels) {
  const bins = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]].map((v) =>
      Math.min(255, Math.round(v / 24) * 24),
    );
    if (rgb.every((v) => v > 232)) continue;
    const key = rgbHex(rgb);
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  return [...bins]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((x) => x[0]);
}
export function removeConnectedBackground(
  input,
  width,
  height,
  tolerance = 28,
) {
  const out = new Uint8ClampedArray(input);
  const visited = new Uint8Array(width * height),
    queue = new Int32Array(width * height);
  const corners = [0, width - 1, (height - 1) * width, width * height - 1];
  const colors = corners
    .filter((n) => input[n * 4 + 3] > 128)
    .map((n) => [input[n * 4], input[n * 4 + 1], input[n * 4 + 2]]);
  if (!colors.length) return out;
  const edge = (n) =>
    colors.some(
      (c) =>
        Math.hypot(
          input[n * 4] - c[0],
          input[n * 4 + 1] - c[1],
          input[n * 4 + 2] - c[2],
        ) <= tolerance,
    );
  let head = 0,
    tail = 0;
  const add = (n) => {
    if (n < 0 || n >= width * height || visited[n]) return;
    visited[n] = 1;
    if (edge(n)) {
      queue[tail++] = n;
      out[n * 4 + 3] = 0;
    }
  };
  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    add(y * width);
    add(y * width + width - 1);
  }
  while (head < tail) {
    const n = queue[head++],
      x = n % width;
    if (x > 0) add(n - 1);
    if (x < width - 1) add(n + 1);
    add(n - width);
    add(n + width);
  }
  return out;
}
export function logoAdvice(pixels, width, height) {
  const clean = removeConnectedBackground(pixels, width, height, 20);
  let weight = 0,
    sum = 0;
  const source = clean.some((v, i) => i % 4 === 3 && v > 128) ? clean : pixels;
  for (let i = 0; i < source.length; i += 4) {
    if (source[i + 3] < 128) continue;
    sum +=
      ((0.2126 * source[i] + 0.7152 * source[i + 1] + 0.0722 * source[i + 2]) *
        source[i + 3]) /
      255;
    weight += source[i + 3] / 255;
  }
  const light = weight > 0 && sum / weight > 160;
  return {
    light,
    logoTile: !light,
    message: light
      ? "Logo clair : privilégiez un fond sombre pour le rendre visible."
      : "Logo sombre : privilégiez un fond clair ou une pastille blanche.",
  };
}
