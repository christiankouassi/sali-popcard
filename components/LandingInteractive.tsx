"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CardPreview, Icon, MiniSite } from "./Preview";

export function HeroCard3D({ data }: { data: any }) {
  const frame = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <div
      className="lp-product-scene"
      aria-label="Aperçu de la PopCard et de son mini-site"
    >
      <div className="lp-scene-orbit orbit-one" />
      <div className="lp-scene-orbit orbit-two" />
      <div className="lp-product-tag">
        <span className="lp-status-dot" /> Votre identité, connectée.
      </div>
      <div className="lp-card-entry">
        <div
          ref={frame}
          className="lp-live-card"
          onPointerMove={(e) => {
            if (
              e.pointerType !== "mouse" ||
              matchMedia("(prefers-reduced-motion: reduce)").matches
            )
              return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            cancelAnimationFrame(raf.current);
            raf.current = requestAnimationFrame(() => {
              if (frame.current)
                frame.current.style.transform = `perspective(1200px) rotateX(${-y * 9}deg) rotateY(${x * 12}deg) rotateZ(-8deg)`;
            });
          }}
          onPointerLeave={() => {
            cancelAnimationFrame(raf.current);
            if (frame.current) frame.current.style.transform = "";
          }}
        >
          <CardPreview
            data={data}
            logo="/assets/logo-white-crop.svg"
            watermark={false}
          />
        </div>
      </div>
      <div className="lp-phone-entry">
        <div className="lp-phone">
          <div className="lp-phone-notch" />
          <div className="lp-phone-screen" inert>
            <MiniSite embedded data={data} logo="/assets/logo-white-crop.svg" />
          </div>
        </div>
      </div>
      <div className="lp-product-caption">
        <Icon kind="qr" />
        <span>
          Une carte PVC.
          <br />
          <b>Un mini-site qui vous ressemble.</b>
        </span>
      </div>
      <span className="lp-example-label">Aperçus de démonstration</span>
    </div>
  );
}

const processSteps = [
  {
    title: "Présentez votre carte.",
    label: "01 / LA RENCONTRE",
    text: "Votre interlocuteur scanne le QR code avec l’appareil photo de son téléphone.",
    icon: "qr",
  },
  {
    title: "Ouvrez toutes les possibilités.",
    label: "02 / VOTRE MINI-SITE",
    text: "Coordonnées, WhatsApp, site web et réseaux sociaux : votre activité tient dans une seule page.",
    icon: "globe",
  },
  {
    title: "Gardez le contact.",
    label: "03 / LA SUITE",
    text: "Votre interlocuteur peut enregistrer votre fiche contact. Vous pouvez ensuite actualiser vos informations depuis votre espace.",
    icon: "user",
  },
];
export function StickyProcess({ sample }: { sample: any }) {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const mq = matchMedia("(min-width: 901px)");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!mq.matches) return;
        for (const entry of entries)
          if (entry.isIntersecting)
            setActive(Number((entry.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-32% 0px -38% 0px", threshold: 0 },
    );
    steps.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <div className="lp-process">
      <div className="lp-process-visual">
        <div className="lp-process-stage" data-active={active}>
          <span className="lp-stage-label">
            <span className="lp-status-dot" />
            {processSteps[active].label}
          </span>
          <div className="lp-stage-content" key={active}>
            {active === 0 ? (
              <div className="lp-scan-demo">
                <CardPreview
                  data={sample}
                  side="verso"
                  logo="/assets/logo-white-crop.svg"
                  watermark={false}
                />
                <div className="lp-scan-line" />
                <span className="lp-scan-caption">
                  <Icon kind="qr" /> Scannez le QR code
                </span>
              </div>
            ) : active === 1 ? (
              <div className="lp-demo-phone" inert>
                <MiniSite
                  embedded
                  data={sample}
                  logo="/assets/logo-white-crop.svg"
                />
              </div>
            ) : (
              <div className="lp-contact-demo">
                <span className="lp-contact-avatar">NB</span>
                <h3>Nadia Bennani</h3>
                <p>Direction commerciale</p>
                <span className="lp-contact-saved">
                  <Icon kind="check" /> Fiche contact prête à enregistrer
                </span>
                <div className="lp-contact-lines">
                  <span>
                    <Icon kind="phone" /> +212 600 000 000
                  </span>
                  <span>
                    <Icon kind="mail" /> contact@exemple.ma
                  </span>
                </div>
                <span className="lp-demo-note">Exemple de présentation</span>
              </div>
            )}
          </div>
          <div className="lp-stage-dots" aria-hidden="true">
            {processSteps.map((_, i) => (
              <i className={i === active ? "active" : ""} key={i} />
            ))}
          </div>
        </div>
      </div>
      <div className="lp-process-steps">
        {processSteps.map((step, i) => (
          <button
            type="button"
            key={step.title}
            ref={(el) => {
              steps.current[i] = el;
            }}
            data-step={i}
            className={"lp-process-step " + (i === active ? "active" : "")}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            <span className="lp-process-number">0{i + 1}</span>
            <span className="lp-step-copy">
              <span className="lp-step-icon">
                <Icon kind={step.icon} />
              </span>
              <strong>{step.title}</strong>
              <span>{step.text}</span>
            </span>
            <span className="lp-step-arrow">↗</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModelExplorer({ sample }: { sample: any }) {
  const [tpl, setTpl] = useState("B");
  const [side, setSide] = useState("recto");
  const [color, setColor] = useState("#173E35");
  const models = [
    ["A", "Essentiel", "Votre logo au premier plan."],
    ["B", "Signature", "Une identité graphique affirmée."],
    ["C", "Studio", "Clair, précis et contemporain."],
  ];
  return (
    <div className="lp-bento">
      <article className="lp-model-explorer">
        <div className="lp-bento-head">
          <span>À VOTRE IMAGE</span>
          <span>03 modèles</span>
        </div>
        <div
          className="lp-model-tabs"
          role="group"
          aria-label="Modèles de démonstration"
        >
          {models.map(([v, name]) => (
            <button
              type="button"
              key={v}
              aria-pressed={v === tpl}
              className={v === tpl ? "active" : ""}
              onClick={() => setTpl(v)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="lp-model-preview">
          <div key={tpl + side + color}>
            <CardPreview
              data={{ ...sample, tpl, primary: color }}
              side={side}
              watermark={false}
              logo={
                (tpl === "A" || tpl === "B") && side === "recto"
                  ? "/assets/logo-white-crop.svg"
                  : "/assets/logo-color.svg"
              }
            />
          </div>
        </div>
        <div className="lp-model-controls">
          <div
            className="lp-swatches"
            role="group"
            aria-label="Couleurs de démonstration"
          >
            {[
              ["#173E35", "Vert profond"],
              ["#1C2C46", "Bleu nuit"],
              ["#633B4A", "Prune"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                style={{ background: value }}
                aria-label={label}
                aria-pressed={value === color}
                onClick={() => setColor(value)}
              >
                {value === color && <Icon kind="check" />}
              </button>
            ))}
          </div>
          <div
            className="lp-side-tabs"
            role="group"
            aria-label="Face de la carte"
          >
            {["recto", "verso"].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === side}
                className={side === value ? "active" : ""}
                onClick={() => setSide(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <h3>{models.find((m) => m[0] === tpl)?.[2]}</h3>
        <p>
          Choisissez un modèle, ajoutez votre logo et composez votre palette
          dans l’éditeur.
        </p>
        <Link href="/inscription" className="lp-text-link">
          Personnaliser ma PopCard <Icon kind="arrow" />
        </Link>
      </article>
      <article className="lp-photo-tile">
        <img
          src="/assets/popcard-rencontre-v3.webp"
          loading="lazy"
          width="1536"
          height="1024"
          alt="Deux professionnels échangent une carte de visite dans un espace de travail lumineux"
        />
        <div>
          <span>DU CONCRET AU NUMÉRIQUE</span>
          <h3>
            La rencontre est réelle.
            <br />
            Le lien continue.
          </h3>
        </div>
      </article>
      <article className="lp-update-tile">
        <span className="lp-tile-icon">
          <Icon kind="settings" />
        </span>
        <h3>
          Vos informations évoluent.
          <br />
          Votre carte vous suit.
        </h3>
        <p>
          Actualisez vos coordonnées et vos liens dans votre espace, sans
          réimprimer votre QR code.
        </p>
        <div className="lp-update-demo">
          <span className="lp-status-dot" /> Un profil toujours à jour{" "}
          <Icon kind="check" />
        </div>
      </article>
    </div>
  );
}

export function LandingMotion() {
  useEffect(() => {
    const targets = document.querySelectorAll(".lp-reveal");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    targets.forEach((el) => {
      el.classList.add("will-reveal");
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
