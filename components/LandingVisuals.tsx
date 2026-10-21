import { CardPreview, StyledQR, Icon } from "./Preview";
export function ScanVisual() {
  return (
    <div
      className="scan-visual"
      aria-label="Une carte scannée ouvre les coordonnées sur un téléphone"
    >
      <div className="scan-card">
        <span>VE</span>
        <StyledQR
          url="https://example.com"
          primary="#1c2c46"
          accent="#1d9878"
          initials="VE"
        />
        <small>Votre entreprise</small>
      </div>
      <div className="scan-arrow">↗</div>
      <div className="scan-phone">
        <div className="phone-notch" />
        <span className="phone-logo">VE</span>
        <strong>Nom complet</strong>
        <small>Votre entreprise</small>
        <div className="phone-actions">
          {["phone", "wa", "user", "globe"].map((kind) => (
            <span key={kind}>
              <Icon kind={kind} />
            </span>
          ))}
        </div>
        <div className="phone-line" />
        <div className="phone-line short" />
        <small>Vos coordonnées réunies</small>
      </div>
      <span className="visual-caption">Un scan, puis le contact.</span>
    </div>
  );
}
export function PaletteVisual() {
  return (
    <div
      className="palette-visual"
      aria-label="Trois associations de couleurs pour personnaliser une carte"
    >
      {[
        ["#1c2c46", "#ffffff", "#1d9878"],
        ["#29362c", "#f3f4e8", "#ba9255"],
        ["#541d38", "#fff4f7", "#cc7c94"],
      ].map((colors, i) => (
        <div className="palette-card" key={i} style={{ background: colors[0] }}>
          <span style={{ background: colors[1], color: colors[0] }}>VE</span>
          <div>
            {colors.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </div>
          <small>Palette {i + 1}</small>
        </div>
      ))}
      <span className="visual-caption">Principale · fond · accent</span>
    </div>
  );
}
export function OrderVisual() {
  return (
    <div className="order-visual" aria-label="Exemple du suivi d’une commande">
      <div className="order-top">
        <Icon kind="user" />
        <strong>Ma commande</strong>
        <span>En production</span>
      </div>
      {[
        ["Reçu déposé", "Justificatif reçu"],
        ["Paiement confirmé", "Contrôle par SALI"],
        ["Production", "Préparation des cartes"],
        ["Expédition", "Suivi de livraison"],
      ].map(([title, detail], i) => (
        <div className={"order-step " + (i < 3 ? "complete" : "")} key={title}>
          <b>{i < 2 ? "✓" : i + 1}</b> {/* taste-skill-ignore */}
          <div>
            <strong>{title}</strong>
            <small>{detail}</small>
          </div>
          {i === 2 && <span className="order-current">En cours</span>}
        </div>
      ))}
      <span className="visual-caption">
        Exemple de suivi dans votre espace.
      </span>
    </div>
  );
}
export function CardPair({ data }: any) {
  return (
    <div className="card-pair">
      <div>
        <CardPreview data={{ ...data, tpl: "B" }} watermark={false} />
      </div>
      <div>
        <CardPreview
          data={{ ...data, tpl: "B" }}
          side="verso"
          watermark={false}
        />
      </div>
      <span className="visual-caption">
        Recto et verso · modèle Carte de visite
      </span>
    </div>
  );
}
