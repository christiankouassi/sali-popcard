import { catalogFont } from "./font-catalog.mjs";
import { safeUrl } from "./business.mjs";
export const customFontId = (value) =>
  /^custom:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
    value || "",
  )?.[1];
export const validFont = (value) =>
  !!catalogFont(value) || !!customFontId(value);
const filled = (value) => typeof value === "string" && !!value.trim();
const phoneOK = (value) =>
  !filled(value) ||
  (/^[+\d\s().-]+$/.test(value) &&
    value.replace(/\D/g, "").length >= 6 &&
    value.replace(/\D/g, "").length <= 15);

// Completion rules are shared by step navigation, checkout and the order API.
// Saving an incomplete draft never requires completion.
export function cardIssues(data = {}, { logo = false } = {}) {
  const issues = [];
  const add = (step, field, message) => {
    if (!issues.some((issue) => issue.field === field))
      issues.push({ step, field, message });
  };
  for (const [field, label, maximum] of [
    ["firstName", "Le prénom", 100],
    ["lastName", "Le nom", 100],
    ["company", "La société", 150],
    ["title", "La fonction", 150],
    ["city", "La ville", 150],
    ["desc", "La description", 2000],
    ["address", "L’adresse", 500],
    ["website", "Le site web", 250],
    ["whatsapp", "Le numéro WhatsApp", 50],
    ["instagram", "Le lien Instagram", 250],
    ["linkedin", "Le lien LinkedIn", 250],
    ["facebook", "Le lien Facebook", 250],
  ]) {
    if (String(data[field] || "").length > maximum)
      add(
        2,
        field,
        label +
          " est limité" +
          (field === "company" ||
          field === "title" ||
          field === "city" ||
          field === "desc" ||
          field === "address"
            ? "e"
            : "") +
          " à " +
          maximum +
          " caractères.",
      );
  }
  if (!["A", "B", "C"].includes(data.tpl))
    add(0, "tpl", "Choisissez un modèle.");
  if (data.tpl === "A" && !logo)
    add(1, "logo", "Ajoutez votre logo pour le modèle Essentiel.");
  for (const [field, label] of [
    ["primary", "principale"],
    ["accent", "d’accent"],
    ["background", "de fond"],
  ])
    if (!/^#[0-9a-f]{6}$/i.test(data[field] || ""))
      add(1, field, "Choisissez une couleur " + label + " valide.");
  for (const field of ["fontTitle", "fontBody"]) {
    const id = customFontId(data[field]);
    if (
      !validFont(data[field]) ||
      (id && !(data.customFonts || []).some((font) => font.id === id))
    )
      add(1, field, "Choisissez une police disponible.");
  }
  if (![data.firstName, data.lastName, data.company].some(filled))
    add(2, "firstName", "Renseignez votre nom ou votre société.");
  for (const [i, phone] of (data.phones || []).entries())
    if (!phoneOK(phone[1]))
      add(
        2,
        "phones." + i,
        "Utilisez un numéro de 6 à 15 chiffres, avec son indicatif si nécessaire.",
      );
  for (const [i, email] of (data.emails || []).entries())
    if (filled(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      add(2, "emails." + i, "Renseignez une adresse e-mail valide.");
  if (!phoneOK(data.whatsapp))
    add(
      2,
      "whatsapp",
      "Renseignez un numéro WhatsApp valide de 6 à 15 chiffres.",
    );
  for (const field of ["website", "instagram", "linkedin", "facebook"])
    if (filled(data[field]) && !safeUrl(data[field].trim()))
      add(
        2,
        field,
        "Utilisez une adresse complète commençant par https:// ou http://.",
      );
  if (!["fr", "en"].includes(data.lang))
    add(2, "lang", "Choisissez la langue du mini-site.");
  const show = data.show || {};
  const hasContact =
    (show.phones &&
      (data.phones || []).some(
        (phone) => filled(phone[1]) && phoneOK(phone[1]),
      )) ||
    (show.emails &&
      (data.emails || []).some(
        (email) =>
          filled(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
      )) ||
    (show.whatsapp && filled(data.whatsapp) && phoneOK(data.whatsapp)) ||
    (show.website && !!safeUrl(data.website)) ||
    (show.social &&
      ["instagram", "linkedin", "facebook"].some(
        (field) => !!safeUrl(data[field]),
      ));
  if (!hasContact)
    add(
      2,
      "contact",
      "Ajoutez au moins un moyen de contact valide et visible : téléphone, e-mail, WhatsApp, site ou réseau social.",
    );
  return issues;
}
