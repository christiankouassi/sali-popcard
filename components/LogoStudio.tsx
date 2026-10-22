"use client";
import { useEffect, useState } from "react";
import { extractPixelColors, palettes, logoAdvice } from "@/lib/colors.mjs";
function inspectLogo(canvas: HTMLCanvasElement) {
  const factor = Math.min(1, 128 / Math.max(canvas.width, canvas.height));
  const sample = document.createElement("canvas");
  sample.width = Math.max(1, Math.round(canvas.width * factor));
  sample.height = Math.max(1, Math.round(canvas.height * factor));
  const ctx = sample.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
  return {
    advice: logoAdvice(pixels, sample.width, sample.height),
    groups: palettes(extractPixelColors(pixels)),
  };
}
export default function LogoStudio({
  disabled,
  onLogo,
  onPalette,
  initialLogo,
  initialResult,
}: any) {
  const [source, setSource] = useState<HTMLCanvasElement | null>(null),
    [preview, setPreview] = useState(""),
    [original, setOriginal] = useState(""),
    [groups, setGroups] = useState<any[]>([]),
    [error, setError] = useState(""),
    [pdf, setPdf] = useState<any>(null),
    [page, setPage] = useState(1),
    [processing, setProcessing] = useState(false),
    [advice, setAdvice] = useState<any>(null);
  useEffect(() => {
    if (!initialLogo) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")!.drawImage(image, 0, 0);
      setSource(canvas);
      const analysis = inspectLogo(canvas);
      setAdvice(analysis.advice);
      setGroups(analysis.groups);
      setOriginal(canvas.toDataURL());
      setPreview(initialResult || canvas.toDataURL());
    };
    image.src = initialLogo;
  }, [initialLogo]);
  async function emit(canvas: HTMLCanvasElement, originalCanvas = source) {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(Error("Image illisible."))),
        "image/png",
      ),
    );
    if (blob.size > 3 * 1024 * 1024)
      throw Error("Le logo converti dépasse 3 Mo.");
    const url = canvas.toDataURL();
    setPreview(url);
    const base = originalCanvas || canvas;
    const originalBlob = await new Promise<Blob>((resolve, reject) =>
      base.toBlob(
        (b) => (b ? resolve(b) : reject(Error("Image illisible."))),
        "image/png",
      ),
    );
    await onLogo(
      new File([blob], "logo.png", { type: "image/png" }),
      url,
      new File([originalBlob], "logo-original.png", { type: "image/png" }),
    );
  }
  async function accept(canvas: HTMLCanvasElement) {
    setSource(canvas);
    const analysis = inspectLogo(canvas);
    setAdvice(analysis.advice);
    setGroups(analysis.groups);
    setOriginal(canvas.toDataURL());
    await emit(canvas, canvas);
  }
  async function renderPDF(doc: any, n: number) {
    const p = await doc.getPage(n),
      v = p.getViewport({ scale: 1 }),
      viewport = p.getViewport({
        scale: Math.min(2, 1400 / Math.max(v.width, v.height)),
      }),
      canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await p.render({
      canvas,
      canvasContext: canvas.getContext("2d")!,
      viewport,
    }).promise;
    await accept(canvas);
  }
  async function load(file: File) {
    setProcessing(true);
    setError("");
    setGroups([]);
    setAdvice(null);
    setPdf(null);
    try {
      if (file.size > 10 * 1024 * 1024)
        throw Error("10 Mo maximum pour le fichier source.");
      if (/\.pdf$/i.test(file.name)) {
        const lib = await import("pdfjs-dist");
        lib.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
        const doc = await lib.getDocument({
          data: new Uint8Array(await file.arrayBuffer()),
        }).promise;
        setPdf(doc);
        setPage(1);
        await renderPDF(doc, 1);
        return;
      }
      let blob: Blob = file;
      if (/\.svg$/i.test(file.name)) {
        const doc = new DOMParser().parseFromString(
          await file.text(),
          "image/svg+xml",
        );
        if (
          doc.querySelector("parsererror") ||
          doc.documentElement.localName !== "svg"
        )
          throw Error("SVG invalide.");
        for (const el of Array.from(doc.querySelectorAll("*"))) {
          if (
            [
              "script",
              "foreignObject",
              "iframe",
              "animate",
              "animateTransform",
              "set",
              "a",
            ].includes(el.localName)
          ) {
            el.remove();
            continue;
          }
          if (
            el.localName === "style" &&
            /@import|url\s*\(\s*[^#]/i.test(el.textContent || "")
          ) {
            el.remove();
            continue;
          }
          for (const a of Array.from(el.attributes)) {
            const value = a.value.trim();
            if (
              a.name.toLowerCase().startsWith("on") ||
              (/href$/i.test(a.name) &&
                !value.startsWith("#") &&
                !/^data:image\/(png|jpeg|webp);base64,/i.test(value)) ||
              (/url\s*\(/i.test(value) &&
                !/^url\(\s*#[\w-]+\s*\)$/i.test(value))
            )
              el.removeAttribute(a.name);
          }
        }
        blob = new Blob([new XMLSerializer().serializeToString(doc)], {
          type: "image/svg+xml",
        });
      } else if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
        throw Error("Choisissez un PNG, JPEG, SVG ou PDF.");
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (image.naturalWidth * image.naturalHeight > 40000000)
          throw Error(
            "Image trop grande. Utilisez un logo de moins de 40 mégapixels.",
          );
        const scale = Math.min(
            1,
            1400 / Math.max(image.naturalWidth, image.naturalHeight),
          ),
          canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas
          .getContext("2d")!
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        await accept(canvas);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  }
  return (
    <div className="logo-studio">
      <label className="field">
        Votre logo · PNG, JPEG, SVG ou PDF
        <input
          disabled={disabled || processing}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) load(f);
          }}
        />
      </label>
      <small>
        Importez votre logo, idéalement avec un fond transparent. Vos couleurs
        vous seront proposées automatiquement.
      </small>
      {pdf?.numPages > 1 && (
        <label className="field">
          Page du PDF
          <select
            aria-label="Page du PDF"
            disabled={disabled || processing}
            value={page}
            onChange={async (e) => {
              setProcessing(true);
              const n = Number(e.target.value);
              setPage(n);
              try {
                await renderPDF(pdf, n);
              } catch (e: any) {
                setError(e.message);
              } finally {
                setProcessing(false);
              }
            }}
          >
            {Array.from({ length: Math.min(pdf.numPages, 100) }, (_, i) => (
              <option key={i} value={i + 1}>
                Page {i + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      {source && (
        <>
          <div className="logo-compare">
            <figure>
              <img src={original} alt="Logo avant traitement" />
              <figcaption>Original</figcaption>
            </figure>
            <figure>
              <img src={preview} alt="Logo utilisé" />
              <figcaption>Logo importé</figcaption>
            </figure>
          </div>
        </>
      )}
      {advice && (
        <div className="logo-advice">
          {advice.message}
          <button
            type="button"
            disabled={disabled || processing}
            onClick={() =>
              onPalette({ ...groups[0], logoTile: advice.logoTile })
            }
          >
            Appliquer le contraste conseillé
          </button>
        </div>
      )}
      {groups.length > 0 && (
        <>
          <h3>Choisissez une palette complète</h3>
          <div className="palette-options">
            {groups.map((g) => (
              <button
                type="button"
                disabled={disabled || processing}
                key={g.name}
                onClick={() => onPalette(g)}
              >
                <span>
                  {[g.primary, g.background, g.accent].map((color, i) => (
                    <i key={i} style={{ background: color }} />
                  ))}
                </span>
                {g.name}
                <small>Principale · fond · accent</small>
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
    </div>
  );
}
