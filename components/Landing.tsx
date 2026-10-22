"use client";
import Link from "next/link";
import { Icon, CardPreview, defaults } from "./Preview";
import { HeroCard3D, BentoGrid, StickyProcess } from "./LandingInteractive";

const sample = {
  ...defaults,
  tpl: "B",
  example: true,
  city: "Casablanca",
  website: "https://entreprise.example.com",
  whatsapp: "+212 600 123 456",
  address: "Boulevard d'Anfa · Casablanca, Maroc",
  linkedin: "https://linkedin.com/company/sali-digicom",
  instagram: "https://instagram.com/sali.digicom",
  facebook: "https://facebook.com/salidigicom",
  firstName: "Karim",
  lastName: "El Amrani",
  title: "Directeur du Développement",
  company: "SALI DigiCom SARL",
  phones: [["Mobile", "+212 600 123 456"]],
  emails: ["contact@sali-digicom.com"],
  desc: "Solutions d'identité numérique et cartes professionnelles connectées de prestige.",
};

export default function Landing() {
  return (
    <div className="landing">
      {/* Barre de navigation haute */}
      <header className="landing-nav">
        <Link className="landing-brand" href="/">
          <img src="/assets/logo-color.svg" alt="SALI DigiCom" />
          <b>PopCard<span className="brand-dot">.</span></b>
        </Link>
        <nav>
          <a href="#avantages">Atouts</a>
          <a href="#parcours">Parcours</a>
          <a href="#modeles">Modèles</a>
          <a href="#offre">Tarifs</a>
          <Link href="/connexion">Se connecter</Link>
          <Link className="button primary has-glow" href="/inscription">
            Créer ma PopCard ↗
          </Link>
        </nav>
      </header>

      {/* Hero Section avec carte 3D interactive */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{/* taste-skill-ignore */}CARTE CONNECTÉE NFC & QR CODE</span>
          <h1>
            Votre réseau.<br />À portée de main.
          </h1>
          <p>
            Une carte de visite sans contact d’exception. Un simple tap sur smartphone transmet
            instantanément vos coordonnées, vos liens et votre univers professionnel sans aucune
            application.
          </p>
          <div className="hero-cta-group">
            <Link className="button primary has-glow" href="/inscription">
              Personnaliser ma carte ↗
            </Link>
            <a className="button ghost" href="#modeles">
              Voir les modèles ↓
            </a>
          </div>
          <div className="hero-badges">
            <span>iPhone et Android</span>
            <span>Sans application</span>
            <span>Modifiable à distance</span>
          </div>
        </div>

        <div className="hero-art-interactive">
          <HeroCard3D data={sample} />
        </div>
      </section>

      {/* Section Bento Grid : 4 technologies majeures */}
      <section id="avantages" className="landing-section">
        <div className="section-title-wrap">
          <span className="eyebrow">{/* taste-skill-ignore */}EXPÉRIENCE NOUVELLE GÉNÉRATION</span>
          <h2>Conçue pour marquer les esprits.</h2>
          <p>La puissance du numérique dans un objet tangible de prestige.</p>
        </div>
        <BentoGrid />
      </section>

      {/* Section Sticky Scroll : Les 3 étapes */}
      <section id="parcours" className="landing-section">
        <div className="section-title-wrap">
          <span className="eyebrow">{/* taste-skill-ignore */}PARCOURS CLIENT SIMPLIFIÉ</span>
          <h2>De votre écran à la poignée de main.</h2>
          <p>Trois étapes fluides pour donner une nouvelle dimension à votre réseau.</p>
        </div>
        <StickyProcess sample={sample} />
      </section>

      {/* Section Modèles de cartes */}
      <section id="modeles" className="landing-section">
        <div className="section-title-wrap">
          <span className="eyebrow">{/* taste-skill-ignore */}FINITIONS DE PRESTIGE</span>
          <h2>Trois signatures visuelles au choix.</h2>
          <p>Chaque modèle sublime votre identité selon votre secteur d’activité.</p>
        </div>
        <div className="landing-models">
          {[
            {
              tpl: "A",
              name: "Logo Pur",
              desc: "Votre marque au premier plan, percutante et mémorable.",
              ideal: "Idéal pour marques visuelles & agences",
            },
            {
              tpl: "B",
              name: "Exécutif Sombre",
              desc: "Fond profond, typographie statutaire et puce NFC apparente.",
              ideal: "Idéal pour dirigeants, avocats & consultants",
            },
            {
              tpl: "C",
              name: "Épuré Studio",
              desc: "Clarté contemporaine, équilibre architectural sur fond clair mat.",
              ideal: "Idéal pour architectes, créatifs & santé",
            },
          ].map((m) => (
            <article key={m.tpl} className="model-showcase-card">
              <div className="model-card-frame">
                <CardPreview data={{ ...sample, tpl: m.tpl }} watermark={false} side="recto" />
              </div>
              <div className="model-info">
                <span className="model-tag">MODÈLE {m.tpl}</span>
                <h3>{m.name}</h3>
                <p>{m.desc}</p>
                <small>{m.ideal}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section Tarifs clairs & transparents */}
      <section id="offre" className="offer">
        <div className="offer-copy">
          <span className="eyebrow">{/* taste-skill-ignore */}TARIFICATION TRANSPARENTE</span>
          <h2>Un investissement unique, valable à vie.</h2>
          <p>
            Votre carte physique et son mini-site hébergé en continu. Mettez à jour vos informations
            gratuitement, autant de fois que nécessaire.
          </p>
        </div>
        <article className="offer-box">
          <span className="offer-label">PopCard Première Commande</span>
          <div className="offer-price">
            <strong>400</strong>
            <small>DH</small>
          </div>
          <ul className="offer-features">
            <li>Carte physique NFC et QR code haute durabilité</li>
            <li>Mini-site personnel hébergé à vie sans abonnement</li>
            <li>Espace membre pour modifier vos coordonnées en direct</li>
            <li>Réassort ultérieur dès 200 DH selon quantité</li>
          </ul>
          <Link className="button primary has-glow" href="/inscription">
            Commander ma PopCard ↗
          </Link>
        </article>
      </section>

      {/* Section FAQ */}
      <section className="landing-section faq">
        <div className="section-title-wrap">
          <span className="eyebrow">{/* taste-skill-ignore */}QUESTIONS FRÉQUENTES</span>
          <h2>Tout ce que vous devez savoir.</h2>
        </div>
        <div className="faq-grid">
          {[
            [
              "Faut-il une application pour scanner la PopCard ?",
              "Non, aucune application n’est requise. Un simple contact (NFC) ou le scan du QR code ouvre immédiatement votre mini-site dans le navigateur du smartphone.",
            ],
            [
              "Puis-je modifier mes coordonnées après réception ?",
              "Oui. Vous accédez à votre espace en ligne à tout moment pour mettre à jour votre numéro, votre e-mail ou vos réseaux. Votre carte physique reste toujours active.",
            ],
            [
              "La PopCard fonctionne-t-elle avec tous les smartphones ?",
              "Oui. 100% des iPhone récents et des smartphones Android sont équipés du lecteur sans contact NFC natif. Pour les appareils plus anciens, le QR code haute lisibilité garantit une compatibilité totale.",
            ],
            [
              "Comment commander pour toute mon équipe ?",
              "Depuis votre espace client, vous pouvez créer autant de PopCards que souhaité pour vos collaborateurs, avec une facturation groupée et un suivi centralisé.",
            ],
          ].map(([q, r]) => (
            <details key={q} className="faq-item">
              <summary>
                <span>{q}</span>
                <span className="faq-icon">+</span>
              </summary>
              <p>{r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Pied de page */}
      <footer className="landing-foot">
        <div className="foot-brand">
          <img src="/assets/logo-white-crop.svg" alt="SALI DigiCom" />
          <p>SALI PopCard · La carte de visite connectée de prestige.</p>
        </div>
        <div className="foot-links">
          <Link href="/conditions">Conditions générales & Confidentialité</Link>
          <a href="mailto:contact@sali-digicom.com">contact@sali-digicom.com</a>
        </div>
        <small>© {new Date().getFullYear()} SALI DigiCom. Tous droits réservés.</small>
      </footer>
    </div>
  );
}
