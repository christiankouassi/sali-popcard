"use client";
import Link from "next/link";
import { useState } from "react";
import { defaults, Icon } from "./Preview";
import {
  HeroCard3D,
  StickyProcess,
  ModelExplorer,
  LandingMotion,
} from "./LandingInteractive";

const sample = {
  ...defaults,
  designVersion: 2,
  tpl: "B",
  primary: "#173E35",
  accent: "#44B68A",
  background: "#FCFBF6",
  firstName: "Nadia",
  lastName: "Bennani",
  title: "Direction commerciale",
  company: "SALI DigiCom",
  phones: [["Mobile", "+212 600 000 000"]],
  emails: ["contact@exemple.ma"],
  city: "Casablanca",
  website: "https://exemple.ma",
  whatsapp: "+212600000000",
  address: "Casablanca, Maroc",
  desc: "Retrouvez mes coordonnées et les liens utiles pour découvrir mon activité.",
};
const faqs = [
  [
    "Faut-il installer une application ?",
    "Non. Le QR code ouvre votre mini-site dans le navigateur du téléphone. Votre interlocuteur peut ensuite vous appeler, vous écrire ou enregistrer votre fiche contact.",
  ],
  [
    "Que puis-je modifier après réception ?",
    "Vos coordonnées et vos liens restent modifiables dans votre espace. Le design physique, le logo et les couleurs utilisés pour la fabrication sont verrouillés après la première commande.",
  ],
  [
    "Quand mon mini-site devient-il public ?",
    "Votre brouillon et ses aperçus restent privés. Le mini-site est activé à la fin de la production, lors de l’expédition de votre carte.",
  ],
  [
    "Puis-je créer des cartes pour mon équipe ?",
    "Oui. Vous pouvez créer plusieurs PopCards depuis votre espace et commander plusieurs exemplaires d’une même carte. Les tarifs selon la quantité sont affichés avant validation.",
  ],
];
export default function Landing() {
  const [menu, setMenu] = useState(false);
  return (
    <div className="landing landing-v3">
      <LandingMotion />
      <header className="lp-nav">
        <Link
          href="/"
          className="lp-brand"
          aria-label="SALI DigiCom PopCard, accueil"
        >
          <img
            src="/assets/logo-color.svg"
            alt="SALI DigiCom"
            width="38"
            height="38"
          />
          <span>
            PopCard<span className="lp-brand-point">.</span>
          </span>
        </Link>
        <button
          className="lp-menu-toggle"
          type="button"
          aria-expanded={menu}
          aria-controls="landing-links"
          onClick={() => setMenu(!menu)}
        >
          {menu ? "Fermer" : "Menu"}{" "}
          <span aria-hidden="true">{menu ? "×" : "☰"}</span>
        </button>
        <nav
          id="landing-links"
          className={menu ? "open" : ""}
          aria-label="Navigation du site"
          onClick={() => setMenu(false)}
        >
          <a href="#fonctionnement">Comment ça marche</a>
          <a href="#modeles">Les modèles</a>
          <a href="#offre">L’offre</a>
          <Link href="/connexion" className="lp-login">
            Mon espace <span>↗</span>
          </Link>
          <Link
            href="/inscription"
            className="lp-button lp-button-dark lp-energy"
          >
            Créer ma PopCard <Icon kind="arrow" />
          </Link>
        </nav>
      </header>
      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">
              <span className="lp-status-dot" /> LA CARTE DE VISITE QUI CRÉE DU
              LIEN
            </span>
            <h1>
              <span>Votre carte.</span>
              <span>Votre univers.</span>
              <em>En un scan.</em>
            </h1>
            <p>
              Une carte PVC personnalisée, reliée à votre mini-site. Vos
              coordonnées, vos liens et votre activité, réunis au même endroit.
            </p>
            <div className="lp-hero-actions">
              <Link
                href="/inscription"
                className="lp-button lp-button-mint lp-energy"
              >
                Créer ma PopCard <Icon kind="arrow" />
              </Link>
              <a href="#fonctionnement" className="lp-hero-demo">
                <span>▷</span> Voir comment ça marche
              </a>
            </div>
            <div className="lp-hero-proof">
              <span>
                <Icon kind="check" /> Sans application
              </span>
              <span>
                <Icon kind="check" /> Coordonnées modifiables
              </span>
            </div>
          </div>
          <HeroCard3D data={sample} />
          <a className="lp-scroll-cue" href="#fonctionnement">
            DÉCOUVRIR <span>↓</span>
          </a>
        </section>
        <div className="lp-intro-strip">
          <span>LA CARTE EN MAIN.</span>
          <span>VOTRE ACTIVITÉ À PORTÉE DE SCAN.</span>
          <span>LE CONTACT, SIMPLEMENT.</span>
        </div>
        <section className="lp-section lp-reveal" id="fonctionnement">
          <div className="lp-section-heading">
            <div>
              <span className="lp-eyebrow">01 / LA RENCONTRE, ET APRÈS ?</span>
              <h2>
                Du premier échange
                <br />
                au prochain contact.
              </h2>
            </div>
            <p>Un geste simple pour partager davantage qu’un numéro.</p>
          </div>
          <StickyProcess sample={sample} />
        </section>
        <section
          className="lp-section lp-models-section lp-reveal"
          id="modeles"
        >
          <div className="lp-section-heading">
            <div>
              <span className="lp-eyebrow">
                02 / UNE CARTE QUI VOUS RESSEMBLE
              </span>
              <h2>
                À chaque identité,
                <br />
                <em>sa signature.</em>
              </h2>
            </div>
            <p>
              Explorez les modèles et leurs deux faces.
              <br />
              Le vôtre commence avec votre logo.
            </p>
          </div>
          <ModelExplorer sample={sample} />
        </section>
        <section className="lp-offer lp-reveal" id="offre">
          <div className="lp-offer-copy">
            <span className="lp-eyebrow">
              03 / PRÊT POUR VOTRE PROCHAINE RENCONTRE
            </span>
            <h2>
              Votre première
              <br />
              PopCard vous attend.
            </h2>
            <p>
              Personnalisez votre carte, vérifiez votre aperçu, puis passez
              commande. Retrouvez chaque étape dans votre espace.
            </p>
            <span className="lp-offer-small">
              <Icon kind="cards" /> Carte physique + mini-site professionnel
            </span>
          </div>
          <div className="lp-price-card">
            <span>PREMIÈRE CARTE & CRÉATION DU MINI-SITE</span>
            <div className="lp-price">
              400 <small>DH</small>
            </div>
            <p>
              Puis des exemplaires supplémentaires à partir de 200 DH selon la
              quantité.
            </p>
            <ul>
              <li>
                <Icon kind="check" /> Carte PVC personnalisée avec QR code
              </li>
              <li>
                <Icon kind="check" /> Mini-site de contact inclus
              </li>
              <li>
                <Icon kind="check" /> Accès à votre espace de gestion
              </li>
            </ul>
            <Link
              href="/inscription"
              className="lp-button lp-button-dark lp-energy"
            >
              Je crée ma PopCard <Icon kind="arrow" />
            </Link>
            <small>Frais de livraison affichés avant validation.</small>
          </div>
        </section>
        <section className="lp-section lp-faq lp-reveal" id="questions">
          <div>
            <span className="lp-eyebrow">LES DERNIÈRES QUESTIONS</span>
            <h2>
              Tout est clair ?<br />
              <em>À vous de jouer.</em>
            </h2>
            <a href="mailto:contact@sali-digicom.com" className="lp-text-link">
              Parlons de votre projet <Icon kind="arrow" />
            </a>
          </div>
          <div className="lp-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="lp-footer">
        <Link href="/" className="lp-brand">
          <img
            src="/assets/logo-white-crop.svg"
            alt="SALI DigiCom"
            width="42"
            height="42"
          />
          <span>
            PopCard<span className="lp-brand-point">.</span>
          </span>
        </Link>
        <span>La rencontre commence avec vous.</span>
        <nav aria-label="Liens utiles">
          <Link href="/conditions">Conditions & confidentialité</Link>
          <a href="mailto:contact@sali-digicom.com">Nous contacter</a>
          <a
            href="https://www.sali-digicom.com"
            target="_blank"
            rel="noreferrer"
          >
            SALI DigiCom ↗
          </a>
        </nav>
        <small>© {new Date().getFullYear()} SALI DigiCom</small>
      </footer>
    </div>
  );
}
