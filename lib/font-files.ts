import * as fontkit from "fontkit";
export function inspectFont(bytes: Buffer) {
  const signature = bytes.subarray(0, 4).toString("latin1");
  const mime = (
    {
      "\x00\x01\x00\x00": "font/ttf",
      OTTO: "font/otf",
      wOFF: "font/woff",
      wOF2: "font/woff2",
    } as Record<string, string>
  )[signature];
  if (!mime || bytes.length < 100 || bytes.length > 2 * 1024 * 1024)
    throw Error(
      "Choisissez une police TTF, OTF, WOFF ou WOFF2 valide de 2 Mo maximum.",
    );
  if (
    (signature === "wOFF" || signature === "wOF2") &&
    bytes.readUInt32BE(16) > 20 * 1024 * 1024
  )
    throw Error("La police décompressée est trop volumineuse.");
  try {
    const font = fontkit.create(bytes) as any;
    if (!font.numGlyphs || !font.familyName || font.characterSet.length > 65536)
      throw Error();
    const family = String(font.familyName)
      .replace(/[\x00-\x1f<>]/g, "")
      .slice(0, 100)
      .trim();
    if (!family) throw Error();
    const axis = font.variationAxes?.wght;
    const weight = axis
      ? `${Math.max(100, Math.round(axis.min))} ${Math.min(900, Math.round(axis.max))}`
      : String(
          Math.max(
            100,
            Math.min(900, Math.round(font["OS/2"]?.usWeightClass || 400)),
          ),
        );
    return { family, weight, mime };
  } catch {
    throw Error("Ce fichier ne contient pas une police exploitable.");
  }
}
