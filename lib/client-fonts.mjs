import { catalogFont, fontCatalog } from "./font-catalog.mjs";
import { supportsMoontime } from "./typography.mjs";
export const customFontId = (value) =>
  /^custom:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
    value || "",
  )?.[1];
export const customFamily = (id) => "PopCardFont_" + id.replaceAll("-", "");
export function cardFont(value, text = "") {
  const id = customFontId(value);
  if (id) return customFamily(id) + ", Montserrat, sans-serif";
  if (value === "Moontime" && !supportsMoontime(text))
    return "Montserrat, sans-serif";
  return catalogFont(value)
    ? JSON.stringify(value) + ", Montserrat, sans-serif"
    : "Montserrat, sans-serif";
}
export function fontCSS(values, customFonts = []) {
  return [...new Set(values)]
    .map((value) => {
      const id = customFontId(value);
      if (id) {
        const font = customFonts.find((font) => font.id === id);
        if (!font) return "";
        // Only the preview API can supply an inline font. Ordinary data uses a
        // same-origin, access-controlled endpoint, never a user-supplied URL.
        const source =
          /^data:font\/(?:ttf|otf|woff2?);base64,[A-Za-z0-9+/=]+$/.test(
            font.previewSource || "",
          )
            ? font.previewSource
            : "/api/fonts/" + id;
        return `@font-face{font-family:${customFamily(id)};src:url(${JSON.stringify(source)});font-weight:${/^\d{3}(?: \d{3})?$/.test(font.weight || "") ? font.weight : "400"};font-style:normal;font-display:swap;}`;
      }
      return (catalogFont(value)?.faces || [])
        .map(
          (face) =>
            `@font-face{font-family:${JSON.stringify(value)};src:url(${JSON.stringify(face.src)}) format('woff2');font-weight:${face.weight};font-style:normal;font-display:swap;unicode-range:${face.range};}`,
        )
        .join("");
    })
    .join("");
}
const normalized = (name) =>
  name
    .toLowerCase()
    .replace(/^[a-z]{6}\+/, "")
    .replace(/(?:regular|bold|italic|medium|semibold|psmt|mt)$/g, "")
    .replace(/[^a-z0-9]/g, "");
export function matchFontNames(names = [], customFonts = []) {
  const candidates = [
    ...fontCatalog.map((font) => ({ value: font.family, family: font.family })),
    ...customFonts.map((font) => ({
      value: "custom:" + font.id,
      family: font.family,
    })),
  ];
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))]
    .slice(0, 12)
    .map((name) => ({
      name,
      match: candidates.find(
        (font) => normalized(font.family) === normalized(name),
      ),
    }));
}
