"use client";
import React from "react";
import QRCode from "qrcode";
import { safeUrl } from "@/lib/business.mjs";
import { contrast, onColor, accessibleColor } from "@/lib/colors.mjs";
import "./reference.css";
export const defaults = {
  tpl: "B",
  primary: "#1C2C46",
  accent: "#1D9878",
  background: "#FFFFFF",
  firstName: "",
  lastName: "",
  company: "",
  title: "",
  city: "",
  desc: "",
  address: "",
  website: "",
  whatsapp: "",
  instagram: "",
  linkedin: "",
  facebook: "",
  lang: "fr",
  fontTitle: "Montserrat",
  fontBody: "Montserrat",
  phones: [["Mobile", ""]],
  emails: [""],
  show: {
    desc: true,
    phones: true,
    whatsapp: true,
    emails: true,
    website: true,
    address: true,
    social: true,
  },
  logoTile: false,
};
const paths: Record<string, React.ReactNode> = {
  phone: (
    <path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 12l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  user: (
    <>
      <circle cx="10" cy="8" r="4" />
      <path d="M3 20a7 7 0 0 1 14 0M19 8v6M16 11h6" />
    </>
  ),
  wa: (
    <>
      <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z" />
      <path d="M9 8.5c0 3 2.5 6 6 6.5l1-1.5-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2z" />
    </>
  ),
  nfc: (
    <>
      <path d="M6 8a8 8 0 0 1 12 0" />
      <path d="M8.5 11.5a4.5 4.5 0 0 1 7 0" />
      <path d="M11 15a1 1 0 0 1 2 0" />
    </>
  ),
};
export function Icon({ kind }: { kind: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind] || paths.globe}
    </svg>
  );
}
export function StyledQR({
  url,
  primary,
  accent,
  logo,
  initials,
}: {
  url: string;
  primary: string;
  accent: string;
  logo?: string;
  initials: string;
}) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" }),
    n = qr.modules.size,
    m = 4,
    c = n / 2,
    hole = n * 0.17; // Agrandissement du médaillon central pour visibilité optimale du logo
  const dark = contrast(primary, "#fff") >= 4.5 ? primary : "#1C2C46";
  const a = contrast(accent, "#fff") >= 4.5 ? accent : dark;
  const dots = [];
  for (let r = 0; r < n; r++)
    for (let k = 0; k < n; k++) {
      if (
        !qr.modules.get(r, k) ||
        (r < 7 && k < 7) ||
        (r < 7 && k >= n - 7) ||
        (r >= n - 7 && k < 7) ||
        Math.hypot(r + 0.5 - c, k + 0.5 - c) < hole + 0.5
      )
        continue;
      dots.push(
        <circle
          key={r * n + k}
          cx={k + m + 0.5}
          cy={r + m + 0.5}
          r={0.48}
          fill={(r * 7 + k * 13 + r * k) % 5 < 2 ? a : dark}
        />,
      );
    }
  const finder = (x: number, y: number) => (
    <g key={x + ":" + y}>
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width="6"
        height="6"
        fill="none"
        stroke={dark}
        strokeWidth="1"
      />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill={dark} />
    </g>
  );
  const cx = c + m;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${n + 8} ${n + 8}`}
      role="img"
      aria-label="QR code de la PopCard"
    >
      <rect width={n + 8} height={n + 8} fill="#fff" />
      {dots}
      {finder(m, m)}
      {finder(m + n - 7, m)}
      {finder(m, m + n - 7)}
      <circle
        cx={cx}
        cy={cx}
        r={hole}
        fill="#fff"
        stroke={a}
        strokeWidth=".22"
      />
      {logo ? (
        <image
          href={logo}
          x={cx - hole * 0.72}
          y={cx - hole * 0.72}
          width={hole * 1.44}
          height={hole * 1.44}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <text
          x={cx}
          y={cx + hole * 0.28}
          textAnchor="middle"
          fontFamily="Montserrat,Arial"
          fontWeight="700"
          fontSize={hole * 0.8}
          fill={dark}
        >
          {initials}
        </text>
      )}
    </svg>
  );
}
function initials(d: any) {
  return (d.company || [d.firstName, d.lastName].join(" ") || "PC")
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function Logo({
  d,
  logo,
  tile = false,
  surface = "#FFFFFF",
}: {
  d: any;
  logo?: string;
  tile?: boolean;
  surface?: string;
}) {
  const dark = onColor(surface) === "#FFFFFF";
  return logo ? (
    <div className={tile ? "logo-tile" : "logo-holder"}>
      <img className="logo-img" src={logo} alt={d.company || "Votre logo"} />
    </div>
  ) : (
    <div
      className="initials logo-placeholder"
      style={{
        background: dark ? "#FFFFFF" : d.primary,
        color: dark ? d.primary : onColor(d.primary),
      }}
    >
      {d.example ? "VE" : "Logo"}
    </div>
  );
}
export function CardPreview({
  data,
  logo,
  side = "recto",
  watermark = true,
  url = "https://popcard.sali-digicom.com",
}: {
  data: any;
  logo?: string;
  side?: string;
  watermark?: boolean;
  url?: string;
}) {
  const d = { ...defaults, ...data },
    P = d.primary,
    A = d.accent,
    bg = d.background || "#fff";
  const qr = (
    <StyledQR
      url={url}
      primary={P}
      accent={A}
      logo={logo}
      initials={initials(d)}
    />
  );
  const lines = [
    ["phone", d.phones[0]?.[1]],
    ["pin", d.city],
    ["mail", d.emails[0]],
    ["globe", d.website?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")],
  ].filter((x) => x[1]);
  return (
    <div
      className={`ref-card model-${d.tpl} side-${side}`}
      style={{ fontFamily: d.fontBody }}
    >
      {d.tpl === "A" ? (
        side === "recto" ? (
          <div className="fill A-recto" style={{ background: P }}>
            <div className="lg">
              <Logo d={d} logo={logo} tile={d.logoTile} surface={P} />
            </div>
          </div>
        ) : (
          <div className="fill A-verso" style={{ background: "#fff" }}>
            <div className="qr">{qr}</div>
            <div className="band" style={{ background: P }} />
          </div>
        )
      ) : d.tpl === "B" ? (
        side === "recto" ? (
          <div
            className="fill B-recto executive-recto"
            style={{ background: P, color: onColor(P) }}
          >
            <div className="exec-header">
              <div className="exec-logo">
                <Logo d={d} logo={logo} tile={d.logoTile} surface={P} />
              </div>
              <div
                className="exec-nfc"
                style={{ color: accessibleColor(A, P, 4.5) }}
                title="Puce sans contact NFC"
              >
                <Icon kind="nfc" />
                <span>NFC</span>
              </div>
            </div>
            <div className="exec-body">
              <div className="nm" style={{ fontFamily: d.fontTitle }}>
                {[d.firstName, d.lastName].join(" ").trim() || "Votre nom"}
              </div>
              {d.title && (
                <div
                  className="tt"
                  style={{ color: accessibleColor(A, P, 4.5), fontFamily: d.fontTitle }}
                >
                  {d.title}
                </div>
              )}
              {d.company && <div className="co">{d.company}</div>}
            </div>
            <div className="exec-rule" style={{ background: A }} />
            <div className="exec-footer">
              {lines.slice(0, 2).map(([k, v]) => (
                <div key={k} className="exec-line">
                  <span className="exec-ico" style={{ color: accessibleColor(A, P, 4.5) }}>
                    <Icon kind={k} />
                  </span>
                  <span className="exec-val">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="fill B-verso" style={{ background: "#fff" }}>
            <div className="frame" style={{ borderColor: A }}>
              <div className="qr">{qr}</div>
            </div>
            <div className="band" style={{ background: P }} />
          </div>
        )
      ) : side === "recto" ? (
        <div className="fill C-recto" style={{ background: bg, color: P }}>
          <div className="lg">
            <Logo d={d} logo={logo} />
          </div>
          <div className="nm" style={{ fontFamily: d.fontTitle }}>
            <span>{d.firstName || "Votre"}</span>
            <span>{d.lastName || "nom"}</span>
          </div>
          <div className="rule" style={{ background: A }} />
          <div className="tt" style={{ color: accessibleColor(A, bg, 4.5) }}>
            <span>{d.title}</span>
            {d.company && <span className="company-line">{d.company}</span>}
          </div>
          <div className="lines">
            {[d.phones[0]?.[1], d.emails[0], d.website]
              .filter(Boolean)
              .map((v, i) => (
                <span key={i}>{v}</span>
              ))}
          </div>
        </div>
      ) : (
        <div className="fill C-verso" style={{ background: P }}>
          <div className="tile">
            <div className="qr">{qr}</div>
          </div>
          <div className="cap" style={{ color: onColor(P) }}>
            {d.lang === "en"
              ? "Scan to save my contact"
              : "Scannez pour enregistrer mon contact"}
          </div>
        </div>
      )}
      {watermark && (
        <div className="wm">
          <span>APERÇU · POPCARD</span>
        </div>
      )}
    </div>
  );
}
export function MiniSite({
  data,
  logo,
  watermark = false,
  placeholders = false,
}: {
  data: any;
  logo?: string;
  watermark?: boolean;
  placeholders?: boolean;
}) {
  const d = { ...defaults, ...data, show: { ...defaults.show, ...data.show } },
    en = d.lang === "en";
  const fullName = [d.firstName, d.lastName].join(" ").trim(),
    name =
      fullName ||
      (placeholders
        ? en
          ? "Full name"
          : "Nom complet"
        : d.company || "Votre nom");
  const phones = d.phones.filter((p: any) => p[1]),
    emails = d.emails.filter(Boolean),
    website = safeUrl(d.website),
    wa = d.whatsapp.replace(/\D/g, "");
  const contact = () => {
    const esc = (s: string) =>
      s
        .replaceAll("\\", "\\\\")
        .replaceAll("\n", "\\n")
        .replaceAll(",", "\\,")
        .replaceAll(";", "\\;");
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:" + esc(fullName || d.company),
      "N:" + esc(d.lastName) + ";" + esc(d.firstName) + ";;;",
      "ORG:" + esc(d.company),
      "TITLE:" + esc(d.title),
      ...(d.show.phones ? phones : []).map((p: any) => "TEL:" + esc(p[1])),
      ...(d.show.emails ? emails : []).map((e: string) => "EMAIL:" + esc(e)),
      ...(d.show.website && website ? ["URL:" + esc(website)] : []),
      "END:VCARD",
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([lines.join("\r\n")], { type: "text/vcard" }),
    );
    a.download = "contact.vcf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const tel = (p: string) => "tel:" + p.replace(/[^+0-9]/g, "");
  const action = (kind: string, text: string, href?: string) =>
    href ? (
      <a
        className="ms-btn"
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
      >
        <Icon kind={kind} />
        {text}
      </a>
    ) : (
      <button
        type="button"
        className="ms-btn"
        disabled
        title={
          en
            ? "Add this information to activate"
            : "Renseignez cette information pour activer ce bouton"
        }
      >
        <Icon kind={kind} />
        {text}
      </button>
    );
  const empty = (text: string) => (
    <span className="ms-line placeholder-value">{text}</span>
  );
  return (
    <article
      className="reference-mini"
      style={
        {
          "--p": d.primary,
          "--a": d.accent,
          "--a-text": accessibleColor(d.accent, d.background || "#FFFFFF", 4.5),
          "--ft": `"${d.fontTitle}",serif`,
          "--fb": `"${d.fontBody}",sans-serif`,
          "--bleu": "#1C2C46",
        } as React.CSSProperties
      }
    >
      <div className="ms-head">
        <div className="lgw">
          <Logo d={d} logo={logo} tile={d.logoTile} surface={d.primary} />
        </div>
      </div>
      <div
        className="ms-card"
        style={{ background: d.background || "#FFFFFF" }}
      >
        <h1 className="ms-name">{name}</h1>
        <div className="ms-title">
          {d.title || (placeholders ? "Fonction" : "")}
        </div>
        <div className="ms-co">
          {d.company || (placeholders ? "Votre entreprise" : "")}
        </div>
        <div className="ms-rule" />
        {d.show.desc && (d.desc || placeholders) && (
          <p className="ms-desc">
            {d.desc || (en ? "Your introduction" : "Votre présentation")}
          </p>
        )}
        <div className="ms-btns">
          {d.show.phones &&
            (phones.length > 0 || placeholders) &&
            action(
              "phone",
              en ? "Call" : "Appeler",
              phones.length ? tel(phones[0][1]) : undefined,
            )}
          {d.show.whatsapp &&
            (wa || placeholders) &&
            action("wa", "WhatsApp", wa ? "https://wa.me/" + wa : undefined)}
          <button
            type="button"
            className="ms-btn main-action"
            disabled={!fullName && !d.company}
            onClick={contact}
          >
            <Icon kind="user" />
            {en ? "Save contact" : "Enregistrer le contact"}
          </button>
          {d.show.website &&
            (website || placeholders) &&
            action("globe", en ? "Website" : "Site web", website)}
        </div>
        {d.show.phones && (phones.length || placeholders) && (
          <section className="ms-sec">
            <h4>{en ? "Phones" : "Téléphones"}</h4>
            {phones.length
              ? phones.map((p: any, i: number) => (
                  <a key={i} className="ms-line" href={tel(p[1])}>
                    {p[1]} {p[0] && `(${p[0]})`}
                  </a>
                ))
              : empty("+212 000 000 000")}
          </section>
        )}
        {d.show.emails && (emails.length || placeholders) && (
          <section className="ms-sec">
            <h4>{en ? "Email" : "E-mails"}</h4>
            {emails.length
              ? emails.map((e: string, i: number) => (
                  <a key={i} className="ms-line" href={"mailto:" + e}>
                    {e}
                  </a>
                ))
              : empty("contact@entreprise.ma")}
          </section>
        )}
        {d.show.website && (website || placeholders) && (
          <section className="ms-sec">
            <h4>{en ? "Website" : "Site web"}</h4>
            {website ? (
              <a
                className="ms-line"
                href={website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {d.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              empty("www.entreprise.ma")
            )}
          </section>
        )}
        {d.show.address && (d.address || placeholders) && (
          <section className="ms-sec">
            <h4>{en ? "Address" : "Adresse"}</h4>
            {d.address ? (
              <>
                <p>{d.address}</p>
                <a
                  className="map"
                  href={
                    "https://www.google.com/maps/search/?api=1&query=" +
                    encodeURIComponent(d.address)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {en ? "View on Google Maps" : "Voir sur Google Maps"}
                </a>
              </>
            ) : (
              empty(en ? "Your address · City" : "Votre adresse · Ville")
            )}
          </section>
        )}
        {d.show.social &&
          (placeholders ||
            ["instagram", "linkedin", "facebook"].some((k) =>
              safeUrl(d[k]),
            )) && (
            <section className="ms-sec">
              <h4>{en ? "Social networks" : "Réseaux sociaux"}</h4>
              <div className="ms-soc">
                {["instagram", "linkedin", "facebook"].map((k) =>
                  safeUrl(d[k]) ? (
                    <a
                      key={k}
                      href={safeUrl(d[k])}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {k}
                    </a>
                  ) : placeholders ? (
                    <span key={k} className="placeholder-value">
                      {k}
                    </span>
                  ) : null,
                )}
              </div>
            </section>
          )}
      </div>
      <footer className="ms-foot">
        {logo && (
          <div className="fl">
            <img className="logo-img" src={logo} alt={d.company || "Logo"} />
          </div>
        )}
        <small>
          {d.title}
          {d.city ? " · " + d.city : ""}
        </small>
        <a
          className="ms-made"
          href="https://www.sali-digicom.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          {en ? "Created by" : "Créé par"} <b>SALI DigiCom</b> ↗
        </a>
      </footer>
      {watermark && <div className="mini-watermark">APERÇU PRIVÉ</div>}
    </article>
  );
}
