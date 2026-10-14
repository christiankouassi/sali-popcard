import Link from "next/link";
import {
  ScanVisual,
  PaletteVisual,
  OrderVisual,
  CardPair,
} from "./LandingVisuals";
import { Icon, CardPreview, MiniSite, defaults } from "./Preview";
const sample = {
  ...defaults,
  example: true,
  city: "Casablanca",
  website: "https://entreprise.example",
  whatsapp: "212600000000",
  address: "Votre adresse · Casablanca, Maroc",
  linkedin: "https://example.com",
  instagram: "https://example.com",
  facebook: "https://example.com",
  firstName: "Nadia",
  lastName: "Bennani",
  title: "Responsable commerciale",
  company: "Votre entreprise",
  phones: [["Mobile", "+212 600 000 000"]],
  emails: ["contact@entreprise.ma"],
  desc: "Retrouvez mes coordonnées et les liens de mon entreprise.",
};
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="landing-brand" href="/">
          <img src="/assets/logo-color.svg" alt="SALI DigiCom" />
          <b>PopCard</b>
        </Link>
        <nav>
          <a href="#modeles">Les modèles</a>
          <a href="#fonctionnement">Le parcours</a>
          <Link href="/connexion">Se connecter</Link>
          <Link className="button primary" href="/inscription">
            Créer ma PopCard
          </Link>
        </nav>
      </header>
      <section className="hero">
        <div>
          <span className="eyebrow">CARTE DE VISITE ET MINI-SITE</span>
          <h1>
            Vos coordonnées,
            <br />à portée de scan.
          </h1>
          <p>
            Une carte physique avec un QR code. Votre interlocuteur retrouve
            votre numéro, votre email et vos liens sur une page adaptée au
            téléphone.
          </p>
          <Link className="button primary" href="/inscription">
            Personnaliser ma carte
          </Link>
          <small>Consultez un aperçu avant de commander.</small>
        </div>
        <div className="hero-art">
          <CardPair data={sample} />
        </div>
      </section>
      <section className="landing-section">
        <div className="story-row">
          <div>
            <h2>Un contact ne devrait pas se perdre.</h2>
            <p>
              Après une rencontre, une carte papier peut rester au fond d’un
              sac. PopCard donne un accès direct à vos coordonnées, sans les
              recopier.
            </p>
          </div>
          <ScanVisual />
        </div>
      </section>
      <section className="landing-section">
        <h2>La carte et la page fonctionnent ensemble.</h2>
        <div className="three-cols">
          {[
            [
              "Une carte physique",
              "Votre identité et votre QR code, selon le modèle choisi.",
            ],
            [
              "Un mini-site",
              "Vos coordonnées et vos liens réunis sur une même page.",
            ],
            [
              "Des informations à jour",
              "Actualisez les coordonnées du mini-site depuis votre espace.",
            ],
          ].map(([t, p]) => (
            <article key={t}>
              <span className="feature-icon">
                <Icon
                  kind={
                    t.includes("site")
                      ? "globe"
                      : t.includes("Équipe")
                        ? "user"
                        : "phone"
                  }
                />
              </span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="fonctionnement" className="landing-section">
        <h2>De la création à la réception.</h2>
        <div className="three-cols">
          {[
            [
              "1. Personnalisez",
              "Créez votre compte, importez votre logo et renseignez vos coordonnées.",
            ],
            [
              "2. Vérifiez et payez",
              "Vérifiez les aperçus, puis déposez le reçu de votre virement.",
            ],
            [
              "3. Recevez votre carte",
              "SALI contrôle le paiement, produit la carte et active votre mini-site à la fin de la production.",
            ],
          ].map(([t, p]) => (
            <article key={t}>
              <span className="feature-icon">
                <Icon
                  kind={
                    t.includes("site")
                      ? "globe"
                      : t.includes("Équipe")
                        ? "user"
                        : "phone"
                  }
                />
              </span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="modeles" className="landing-section">
        <h2>Trois compositions, selon votre identité.</h2>
        <div className="landing-models">
          {[
            ["A", "Logo"],
            ["B", "Carte de visite"],
            ["C", "Épuré"],
          ].map(([tpl, name]) => (
            <article key={tpl}>
              <CardPreview data={{ ...sample, tpl }} watermark={false} />
              <h3>{name}</h3>
              <p>
                {tpl === "A"
                  ? "Le logo occupe le recto."
                  : tpl === "B"
                    ? "Le logo, le nom et les coordonnées partagent le recto."
                    : "Un fond clair et une place importante donnée au nom."}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="story-row">
          <div>
            <h2>Votre logo, vos couleurs.</h2>
            <p>
              Importez votre logo une seule fois, en PNG, JPEG, SVG ou PDF.
              Choisissez une palette qui associe couleur principale, fond et
              accent, puis ajustez-la si nécessaire.
            </p>
          </div>
          <PaletteVisual />
        </div>
      </section>
      <section className="landing-section">
        <h2>Une page conçue pour le téléphone.</h2>
        <div className="two-cols">
          <div>
            <p>
              Appelez, ouvrez WhatsApp, enregistrez le contact ou consultez le
              site de l’entreprise. Les coordonnées, l’adresse et les réseaux
              restent accessibles plus bas.
            </p>
            <p>
              Le lien public est remis après la production. Avant cela, seuls
              les aperçus privés sont disponibles.
            </p>
          </div>
          <MiniSite data={sample} />
        </div>
      </section>
      <section className="landing-section">
        <h2>Pour les rencontres professionnelles.</h2>
        <div className="three-cols">
          {[
            [
              "Rendez-vous client",
              "Laissez vos coordonnées et les liens utiles après votre échange.",
            ],
            [
              "Salons et événements",
              "Partagez votre contact depuis le QR code de votre carte.",
            ],
            [
              "Équipes",
              "Créez plusieurs PopCards et retrouvez leurs commandes dans votre espace.",
            ],
          ].map(([t, p]) => (
            <article key={t}>
              <span className="feature-icon">
                <Icon
                  kind={
                    t.includes("site")
                      ? "globe"
                      : t.includes("Équipe")
                        ? "user"
                        : "phone"
                  }
                />
              </span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="offre" className="offer">
        <div>
          <h2>Une offre lisible.</h2>
          <p>
            Une première carte physique et son mini-site. Le total de votre
            commande est présenté avant le paiement.
          </p>
        </div>
        <article>
          <span>Première PopCard</span>
          <strong>
            400 <small>DH</small>
          </strong>
          <p>
            Exemplaires supplémentaires : dès 200 DH selon quantité. Livraison
            selon destination.
          </p>
          <Link className="button primary" href="/inscription">
            Créer mon aperçu
          </Link>
        </article>
      </section>
      <section className="landing-section">
        <div className="story-row">
          <div>
            <h2>Un paiement par virement, suivi dans votre espace.</h2>
            <p>
              Les coordonnées bancaires s’affichent lors de la commande.
              Effectuez le virement et ajoutez son justificatif. La production
              commence après confirmation du paiement par SALI.
            </p>
            <p>
              Vous retrouvez l’état de la commande et les informations de
              livraison dans « Mes commandes ».
            </p>
          </div>
          <OrderVisual />
        </div>
      </section>
      <section className="landing-section faq">
        <h2>Vos questions.</h2>
        {[
          [
            "Puis-je consulter un aperçu avant de payer ?",
            "Oui : le recto, le verso et le mini-site avec un filigrane.",
          ],
          [
            "Dois-je vérifier mon email ?",
            "Oui, avant de commander. Vous pouvez préparer votre création auparavant.",
          ],
          [
            "Quand la page devient-elle publique ?",
            "À la fin de la production, lors du passage de la commande à l’expédition.",
          ],
          [
            "Puis-je changer mes coordonnées ?",
            "Oui pour le mini-site. L’identité imprimée et le modèle sont verrouillés après une commande.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <section className="landing-section">
        <h2>Besoin d’aide pour commencer ?</h2>
        <p>
          Le guide de votre espace explique chaque étape. Pour une question,
          contactez SALI DigiCom.
        </p>
        <a href="mailto:contact@sali-digicom.com">contact@sali-digicom.com</a>
      </section>
      <footer className="landing-footer rich-footer">
        <div className="footer-grid">
          <div className="footer-about">
            <img src="/assets/logo-color.svg" alt="SALI DigiCom" />
            <h3>PopCard</h3>
            <p>Une carte physique. Un mini-site. Vos coordonnées à jour.</p>
          </div>
          <nav aria-label="Découvrir PopCard">
            <strong>Découvrir</strong>
            <a href="#modeles">Les trois modèles</a>
            <a href="#fonctionnement">Comment ça marche</a>
            <a href="#offre">L’offre</a>
          </nav>
          <nav aria-label="Votre espace">
            <strong>Votre espace</strong>
            <Link href="/inscription">Créer ma PopCard</Link>
            <Link href="/connexion">Se connecter</Link>
            <Link href="/app/help">Aide</Link>
          </nav>
          <div className="footer-contact">
            <strong>Une question ?</strong>
            <a href="mailto:contact@sali-digicom.com">
              contact@sali-digicom.com
            </a>
            <p>
              Contactez SALI DigiCom pour être accompagné dans votre création.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>SALI DigiCom · PopCard</span>
          <Link href="/conditions">Conditions et confidentialité</Link>
          <a
            className="creator-link"
            href="https://www.sali-digicom.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Créé par SALI DigiCom ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
