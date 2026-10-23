// A tiny preview sample is enough to distinguish the background from the
// lettering. CSS screen blending removes the opaque background for the white
// version without processing a full-resolution image on every render.
export function monochromeLogoStyle(pixels, width, height) {
  const borders = [];
  const ink = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const n = (y * width + x) * 4,
        a = pixels[n + 3];
      const value =
        (0.2126 * pixels[n] + 0.7152 * pixels[n + 1] + 0.0722 * pixels[n + 2]) /
        255;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1)
        borders.push({ value, a });
      if (a > 200) ink.push(value);
    }
  if (
    !borders.length ||
    borders.filter((pixel) => pixel.a < 128).length > borders.length * 0.5 ||
    !ink.length
  )
    return { filter: "brightness(0) invert(1)" };
  const opaque = borders.filter((pixel) => pixel.a > 200);
  if (!opaque.length) return { filter: "brightness(0) invert(1)" };
  const background =
    opaque.reduce((sum, pixel) => sum + pixel.value, 0) / opaque.length;
  const minimum = Math.min(...ink),
    maximum = Math.max(...ink);
  const foreground =
    Math.abs(background - minimum) > Math.abs(background - maximum)
      ? minimum
      : maximum;
  if (Math.abs(background - foreground) < 0.08)
    return { filter: "brightness(0) invert(1)" };
  const threshold = Math.max(0.02, (background + foreground) / 2);
  return {
    filter: `grayscale(1) brightness(${0.5 / threshold}) contrast(100)${background > foreground ? " invert(1)" : ""}`,
    mixBlendMode: "screen",
  };
}
