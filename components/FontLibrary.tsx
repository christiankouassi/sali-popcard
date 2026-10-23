"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { fontCatalog } from "@/lib/font-catalog.mjs";
import { cardFont, matchFontNames } from "@/lib/client-fonts.mjs";
import CardFonts from "./CardFonts";

export default function FontLibrary({
  data,
  setData,
  disabled,
  onBusy,
  analysis,
}: any) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Toutes"),
    [page, setPage] = useState(0),
    [personal, setPersonal] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("fonts")
      .then(setPersonal)
      .catch(() =>
        setError(
          "Vos polices importées ne sont pas disponibles. Réessayez le chargement.",
        ),
      );
  }, []);
  const custom = [...personal, ...(data.customFonts || [])].filter(
    (font, i, all) => all.findIndex((f) => f.id === font.id) === i,
  );
  const fonts = [
    ...fontCatalog.map((font) => ({ ...font, value: font.family })),
    ...custom.map((font) => ({
      ...font,
      value: "custom:" + font.id,
      category: "Mes polices",
    })),
  ];
  const clean = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const filtered = fonts.filter(
    (font) =>
      (category === "Toutes" || font.category === category) &&
      clean(font.family).includes(clean(query.trim())),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 6)),
    shown = filtered.slice(
      Math.min(page, pages - 1) * 6,
      Math.min(page, pages - 1) * 6 + 6,
    );
  const choose = (key: string, value: string) => {
    const selected = custom.find((font) => "custom:" + font.id === value);
    setData((current: any) => ({
      ...current,
      [key]: value,
      customFonts: selected
        ? [
            ...(current.customFonts || []).filter(
              (font: any) => font.id !== selected.id,
            ),
            selected,
          ]
        : current.customFonts || [],
    }));
  };
  async function upload(file: File) {
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      if (file.size > 2 * 1024 * 1024)
        throw Error("2 Mo maximum pour une police.");
      if (!/\.(ttf|otf|woff2?)$/i.test(file.name))
        throw Error("Choisissez un fichier TTF, OTF, WOFF ou WOFF2.");
      const form = new FormData();
      form.set("file", file);
      const font = await api("fonts", form);
      setPersonal((current) => [
        ...current.filter((f) => f.id !== font.id),
        font,
      ]);
      setData((current: any) => ({
        ...current,
        fontTitle: "custom:" + font.id,
        customFonts: [
          ...(current.customFonts || []).filter((f: any) => f.id !== font.id),
          font,
        ],
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  const matches = matchFontNames(analysis?.names || [], custom);
  return (
    <section className="font-library" aria-label="Bibliothèque de polices">
      <h3>Vos polices, votre identité.</h3>
      <p>
        {fontCatalog.length} familles installées, des styles classiques aux
        caractères arabes. Recherchez une police ou importez celle de votre
        charte.
      </p>
      <div className="two-cols">
        <label className="field">
          Rechercher une police
          <input
            type="search"
            placeholder="Ex. Poppins, Lora, Cairo…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="field">
          Style de police
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            {["Toutes", ...new Set(fonts.map((font) => font.category))].map(
              (name) => (
                <option key={name}>{name}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="two-cols">
        {["fontTitle", "fontBody"].map((key, i) => (
          <label className="field" key={key}>
            {i ? "Police des textes" : "Police des titres"}
            <select
              data-card-field={key}
              aria-label={i ? "Police des textes" : "Police des titres"}
              disabled={disabled || busy}
              value={data[key]}
              onChange={(e) => choose(key, e.target.value)}
            >
              {fonts
                .filter(
                  (font) => filtered.includes(font) || font.value === data[key],
                )
                .map((font) => (
                  <option value={font.value} key={font.value}>
                    {font.family}
                  </option>
                ))}
            </select>
            <span
              className="font-current"
              style={{ fontFamily: cardFont(data[key]) }}
            >
              {i
                ? "Le plaisir de garder le contact."
                : [data.firstName, data.lastName].filter(Boolean).join(" ") ||
                  "Votre nom, votre style."}
            </span>
          </label>
        ))}
      </div>
      <CardFonts
        data={{ ...data, customFonts: custom }}
        values={[
          data.fontTitle,
          data.fontBody,
          ...shown.map((font) => font.value),
        ]}
      />
      <p className="font-results" role="status">
        {filtered.length} police{filtered.length > 1 ? "s" : ""} disponible
        {filtered.length > 1 ? "s" : ""}
        {!filtered.length ? " · Essayez un autre nom ou un autre style." : ""}
      </p>
      <div className="font-grid">
        {shown.map((font) => (
          <article key={font.value} className="font-option">
            <strong>{font.family}</strong>
            <span style={{ fontFamily: cardFont(font.value) }}>
              {font.category === "Arabe"
                ? "مرحبا بكم — Bonjour"
                : "Votre prochaine rencontre"}
            </span>
            <div>
              <button
                type="button"
                disabled={disabled || busy}
                aria-pressed={data.fontTitle === font.value}
                onClick={() => choose("fontTitle", font.value)}
              >
                Titres
              </button>
              <button
                type="button"
                disabled={disabled || busy}
                aria-pressed={data.fontBody === font.value}
                onClick={() => choose("fontBody", font.value)}
              >
                Textes
              </button>
            </div>
          </article>
        ))}
      </div>
      {pages > 1 && (
        <nav className="font-pagination" aria-label="Pages de la bibliothèque">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            ← Précédentes
          </button>
          <span>
            {Math.min(page + 1, pages)} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
          >
            Suivantes →
          </button>
        </nav>
      )}
      <label className="field font-import">
        Importer votre police
        <input
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          disabled={disabled || busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.currentTarget.value = "";
            if (file) void upload(file);
          }}
        />
        <small>
          TTF, OTF, WOFF ou WOFF2 · 2 Mo maximum. La police importée est
          appliquée aux titres ; elle reste aussi disponible pour les textes.
        </small>
      </label>
      {busy && <p role="status">Vérification et import de la police…</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}{" "}
          <button
            type="button"
            className="textlink"
            onClick={() =>
              api("fonts")
                .then((fonts) => {
                  setPersonal(fonts);
                  setError("");
                })
                .catch((e) => setError(e.message))
            }
          >
            Recharger mes polices
          </button>
        </p>
      )}
      {analysis && (
        <div className="logo-font-analysis">
          <h4>La police de votre logo</h4>
          {matches.length ? (
            <>
              <p>Noms lus dans votre fichier {analysis.kind} :</p>
              {matches.map((result: any) => (
                <div className="font-detection" key={result.name}>
                  <span>{result.name}</span>
                  {result.match ? (
                    <button
                      type="button"
                      disabled={disabled || busy}
                      onClick={() => choose("fontTitle", result.match.value)}
                    >
                      Appliquer aux titres
                    </button>
                  ) : (
                    <small>
                      À importer si vous possédez le fichier de cette police.
                    </small>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p>
              Le nom de la police n’est pas présent dans ce fichier. Une image
              ou un logo converti en tracés ne permet pas de l’extraire
              exactement.
            </p>
          )}
          <p>
            Comparez les aperçus au lettrage du logo. Le filtre « Style de
            police » permet de rechercher une alternative, puis de confirmer
            votre choix.
          </p>
          <div className="font-suggestions">
            {[
              "Montserrat",
              "Poppins",
              "Playfair Display",
              "Dancing Script",
            ].map((family) => (
              <button
                type="button"
                disabled={disabled || busy}
                key={family}
                onClick={() => {
                  setQuery(family);
                  setCategory("Toutes");
                  setPage(0);
                }}
              >
                {family}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
