// Glyph coverage of the user-supplied MoonTime Regular font.
const glyphs = new Set(
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz{|}~\u00a1\u00a2\u00a3\u00a4\u00a5\u00a6\u00a7\u00a9\u00ab\u00ac\u00ae\u00b0\u00b1\u00b6\u00b7\u00bb\u00bf\u00d7\u00f7\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u2044\u20ac\u2122\u2202\u2205\u220f\u2211\u2212\u221a\u221e\u222b\u2248\u2260\u2264\u2265\u25ca",
);
export function supportsMoontime(text = "") {
  return [...text].every(
    (character) => /\s/u.test(character) || glyphs.has(character),
  );
}
export function brandFont(value, text = "") {
  return value === "Moontime" && supportsMoontime(text)
    ? "Moontime, Montserrat, sans-serif"
    : "Montserrat, sans-serif";
}
