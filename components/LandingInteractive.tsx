"use client";
import React, { useState, useRef } from "react";
import Link from "next/link";
import { Icon, CardPreview } from "./Preview";

// --- Carte 3D interactive avec effet de brillance / tilt au curseur ----------
export function HeroCard3D({ data }: { data: any }) {
  const [rot, setRot] = useState({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width) * 2 - 1; // -1 à +1
    const py = (y / rect.height) * 2 - 1; // -1 à +1
    setRot({
      x: -py * 14, // inclinaison X
      y: px * 16,  // inclinaison Y
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100,
      active: true,
    });
  };

  const onMouseLeave = () => {
    setRot({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });
  };

  return (
    <div
      ref={ref}
      className="hero-tilt-wrapper"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="hero-tilt-card"
        style={{
          transform: `perspective(1000px) rotateX(${rot.x}deg) rotateY(${rot.y}deg) ${
            rot.active ? "scale3d(1.03, 1.03, 1.03)" : "scale3d(1, 1, 1)"
          }`,
        }}
      >
        <CardPreview data={data} watermark={false} side="recto" />
        <div
          className="hero-card-glare"
          style={{
            background: rot.active
              ? `radial-gradient(circle at ${rot.glareX}% ${rot.glareY}%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%)` /* taste-skill-ignore */
              : "none",
            opacity: rot.active ? 1 : 0,
          }}
        />
      </div>
      <div className="hero-tilt-shadow" style={{ opacity: rot.active ? 0.9 : 0.5 }} />
    </div>
  );
}

// --- Section Bento Grid interactive ------------------------------------------
export function BentoGrid() {
  const [synced, setSynced] = useState(false);

  return (
    <div className="bento-grid">
      {/* Tuile 1 : Grand format - Le Geste Sans Contact */}
      <article className="bento-card bento-wide">
        <div className="bento-visual-bg">
          <img
            src="/assets/nfc-tap-action.jpg"
            alt="Démonstration du geste NFC avec la carte SALI PopCard"
            className="bento-photo"
          />
          <div className="bento-gradient-overlay" />
          <div className="nfc-pulse-ring" />
        </div>
        <div className="bento-content">
          <span className="bento-tag">SANS CONTACT · ZÉRO APPLICATION</span>
          <h3>Le geste instantané : Tap & Connect</h3>
          <p>
            Approchez votre PopCard du haut d’un smartphone. Votre profil professionnel s’affiche
            immédiatement sans installer d’application ni saisir de numéro.
          </p>
        </div>
      </article>

      {/* Tuile 2 : Mini-site dynamique */}
      <article className="bento-card bento-minisite">
        <div className="bento-content">
          <span className="bento-tag">PRÉSENCE NUMÉRIQUE</span>
          <h3>Votre mini-site professionnel</h3>
          <p>
            Appel direct, messagerie WhatsApp, liens LinkedIn, site web et téléchargement de votre
            fiche contact en 1 clic.
          </p>
          <div className="mini-actions-preview">
            <span className="action-pill"><Icon kind="phone" /> Appeler</span>
            <span className="action-pill action-wa"><Icon kind="wa" /> WhatsApp</span>
            <span className="action-pill"><Icon kind="globe" /> Site</span>
            <span className="action-pill action-vcard"><Icon kind="user" /> Enregistrer contact</span>
          </div>
        </div>
      </article>

      {/* Tuile 3 : Mise à jour en temps réel */}
      <article className="bento-card bento-update">
        <div className="bento-content">
          <span className="bento-tag">VALABLE À VIE</span>
          <h3>Mise à jour à distance</h3>
          <p>
            Nouveau poste ou changement de numéro ? Modifiez votre profil en ligne, votre carte
            physique reste la même pour toujours.
          </p>
          <div className="sync-demo">
            <div className="sync-badge">
              <span className={`sync-dot ${synced ? "ping" : ""}`} />
              <span>{synced ? "Synchronisé en direct" : "Profil connecté"}</span>
            </div>
            <button
              type="button"
              className="sync-toggle-btn"
              onClick={() => setSynced(!synced)}
            >
              Simuler mise à jour ↻
            </button>
          </div>
        </div>
      </article>

      {/* Tuile 4 : Écologique & Rentable */}
      <article className="bento-card bento-eco">
        <div className="bento-content">
          <span className="bento-tag">IMPACT & ÉCONOMIE</span>
          <div className="eco-metric">
            <strong>88%</strong>
            <span>des cartes papier finissent jetées</span>
          </div>
          <p>
            Une seule PopCard remplace des milliers de cartes papier obsolètes. Écologique, moderne et
            rentable dès votre premier salon.
          </p>
        </div>
      </article>
    </div>
  );
}

// --- Section Sticky Scroll synchronisée ---------------------------------------
export function StickyProcess({ sample }: { sample: any }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: 1,
      title: "Personnalisez votre identité",
      desc: "Importez votre logo d’entreprise, sélectionnez vos teintes et renseignez vos coordonnées. Votre aperçu en direct réagit instantanément.",
      badge: "Éditeur fluide en temps réel",
      tpl: "B",
    },
    {
      step: 2,
      title: "Fabrication de prestige",
      desc: "Chaque carte intègre une puce NFC haute durabilité protégée dans un corps satiné rigide, avec gravure soignée et QR code haute lisibilité.",
      badge: "Puce NTAG & finitions haut de gamme",
      tpl: "A",
    },
    {
      step: 3,
      title: "Réseautez sans limite",
      desc: "Recevez votre carte en main propre. Votre mini-site est activé dès l’expédition : vous partagez votre univers professionnel en un seul geste.",
      badge: "Prêt à l'emploi dès réception",
      tpl: "C",
    },
  ];

  return (
    <div className="sticky-process-wrap">
      {/* Colonne gauche fixe : Carte avec mise à jour interactive selon l'étape */}
      <div className="sticky-preview-col">
        <div className="sticky-card-box">
          <span className="step-indicator-pill">ÉTAPE {steps[activeStep].step} · MODÈLE {steps[activeStep].tpl}</span>
          <CardPreview data={{ ...sample, tpl: steps[activeStep].tpl }} watermark={false} side="recto" />
          <div className="sticky-phone-glimpse">
            <img src="/assets/hero-showcase.jpg" alt="Aperçu mobile SALI PopCard" />
          </div>
        </div>
      </div>

      {/* Colonne droite défilante : Les étapes */}
      <div className="sticky-steps-col">
        {steps.map((st, i) => (
          <div
            key={st.step}
            className={`process-step-item ${activeStep === i ? "active-step" : ""}`}
            onMouseEnter={() => setActiveStep(i)}
            onClick={() => setActiveStep(i)}
          >
            <span className="step-num">{st.step}</span>
            <span className="step-badge">{st.badge}</span>
            <h3>{st.title}</h3>
            <p>{st.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
