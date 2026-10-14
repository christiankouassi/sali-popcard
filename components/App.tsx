"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Landing from "./Landing";
import LogoStudio from "./LogoStudio";
import { CardPreview, MiniSite, defaults } from "./Preview";
import { labels, price, transitions } from "@/lib/business.mjs";
export async function api(path: string, data?: any) {
  const res = await fetch("/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers:
      data instanceof FormData
        ? {}
        : data === undefined
          ? {}
          : { "Content-Type": "application/json" },
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
    cache: "no-store",
  });
  const value = await res.json();
  if (!res.ok) throw Error(value.error || "Erreur de connexion");
  return value;
}
const money = (v: number) =>
  new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(v);
const title = (c: any) =>
  [c.data.firstName, c.data.lastName].join(" ").trim() ||
  c.data.company ||
  "PopCard sans titre";
const logo = (c: any) => (c.logo_id ? "/api/files/" + c.logo_id : undefined);
const date = (s: string) => new Date(s).toLocaleDateString("fr-FR");
function Field({ label, ...props }: any) {
  return (
    <label className="field">
      {label}
      <input {...props} />
    </label>
  );
}
function Message({ text }: { text: string }) {
  return text ? (
    <p className="notice" role="status">
      {text}
    </p>
  ) : null;
}
export default function App({ path }: { path: string }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(undefined);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const refresh = () =>
    api("me")
      .then(setUser)
      .catch(() => setUser(null));
  useEffect(() => {
    refresh();
    api("config")
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, [path]);
  if (path.startsWith("/production/"))
    return <Production id={path.split("/")[2]} />;
  if (path.startsWith("/p/")) return <Public slug={path.split("/")[2]} />;
  if (path === "/") return <Landing />;
  if (path === "/apercu") return <SharedPreview />;
  if (
    [
      "/connexion",
      "/inscription",
      "/mot-de-passe-oublie",
      "/reinitialisation",
      "/verification",
    ].includes(path)
  )
    return (
      <Auth
        path={path}
        onDone={() => {
          window.location.href = "/app";
        }}
      />
    );
  if (path === "/conditions")
    return (
      <div className="document">
        <Link href="/">← PopCard</Link>
        <h1>Conditions PopCard</h1>
        <p>
          Votre aperçu est privé. La commande implique votre confirmation des
          coordonnées et des droits d’utilisation sur les logos, textes et
          images fournis. Le paiement par virement est validé manuellement après
          vérification bancaire. Le lien public devient disponible à la fin de
          la production, lors de l’expédition.
        </p>
        <p>
          Les informations légales, conditions commerciales définitives et
          modalités de rétractation doivent être validées par SALI DigiCom avant
          l’ouverture des commandes.
        </p>
        <h2>Confidentialité</h2>
        <p>
          Les coordonnées saisies dans une PopCard publiée sont accessibles aux
          visiteurs de son lien. Les justificatifs de paiement restent privés.
          Contact : contact@sali-digicom.com.
        </p>
      </div>
    );
  if (user === undefined)
    return <div className="loading">Chargement de votre espace…</div>;
  if (!user)
    return (
      <div className="document">
        <h1>Votre espace PopCard</h1>
        <p>Connectez-vous pour continuer.</p>
        <Link className="button primary" href="/connexion">
          Se connecter
        </Link>
      </div>
    );
  const links = [
    ["/app", "◫", "Vue d’ensemble"],
    ["/app/cards", "▤", "Mes PopCards"],
    ["/app/orders", "◷", "Mes commandes"],
    ["/app/profile", "◎", "Profil et facturation"],
    ["/app/account", "⚙", "Mon compte"],
    ["/app/help", "?", "Aide"],
  ];
  return (
    <div className="workspace">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <Link className="brand" href="/">
          <img src="/assets/logo-white-crop.svg" alt="SALI DigiCom" />
          <span>
            PopCard<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="sidebar-caption">MON ESPACE</div>
        <nav>
          {links.map(([href, icon, label]) => (
            <Link
              onClick={() => setMenu(false)}
              className={path === href ? "active" : ""}
              href={href}
              key={href}
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
          {user.is_admin && (
            <Link
              href="/app/admin"
              className={path === "/app/admin" ? "active" : ""}
            >
              ◇ Administration
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <b>{user.name}</b>
          <small>{user.email}</small>
          <button
            onClick={async () => {
              await api("auth/logout", {});
              setUser(null);
              router.push("/connexion");
            }}
          >
            Se déconnecter ↗
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenu(!menu)}>
            ☰ Menu
          </button>
          <span>Votre présence, toujours à portée de main.</span>
          <Link className="button primary small" href="/app/cards/new">
            + Créer une PopCard
          </Link>
        </header>
        <div className="content">
          <Message text={error} />
          {!user.verified_at && (
            <div className="verification-banner">
              Votre e-mail reste à vérifier avant de commander.{" "}
              <button
                onClick={async () => {
                  try {
                    const result = await api("auth/resend", {});
                    if (result.status === "failed")
                      throw Error(
                        "L’envoi a échoué. Contactez SALI DigiCom pour vérifier le SMTP.",
                      );
                    setError(
                      result.status === "sent"
                        ? "Lien envoyé. Vérifiez votre boîte mail."
                        : "Lien enregistré dans le journal des emails. Le SMTP doit être configuré pour un envoi réel.",
                    );
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
              >
                Renvoyer le lien
              </button>
            </div>
          )}
          {path === "/app" ? (
            <Dashboard />
          ) : path === "/app/cards" ? (
            <Cards />
          ) : path === "/app/cards/new" ||
            /^\/app\/cards\/[^/]+$/.test(path) ? (
            <Editor
              id={path.endsWith("/new") ? undefined : path.split("/")[3]}
            />
          ) : path.includes("/checkout") ? (
            <Checkout id={path.split("/")[3]} user={user} config={config} />
          ) : path === "/app/orders" ? (
            <Orders />
          ) : path.startsWith("/app/orders/") ? (
            <OrderDetail id={path.split("/")[3]} config={config} />
          ) : path === "/app/profile" ? (
            <Profile user={user} refresh={refresh} />
          ) : path === "/app/account" ? (
            <Account />
          ) : path === "/app/admin" && user.is_admin ? (
            <Admin />
          ) : (
            <Help />
          )}
        </div>
      </main>
    </div>
  );
}
function Heading({ eyebrow, title, children }: any) {
  return (
    <div className="pagehead">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}
function Auth({ path, onDone }: any) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const register = path === "/inscription",
    forgot = path === "/mot-de-passe-oublie",
    reset = path === "/reinitialisation",
    verify = path === "/verification";
  const submit = async (e: any) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const data = Object.fromEntries(f);
      if (register) (data as any).terms = f.get("terms") === "on";
      if (reset || verify)
        (data as any).token =
          new URLSearchParams(location.search).get("token") || "";
      const r = await api(
        "auth/" +
          (register
            ? "register"
            : forgot
              ? "forgot"
              : reset
                ? "reset"
                : verify
                  ? "verify"
                  : "login"),
        data,
      );
      if (forgot) {
        setError(r.message);
        setComplete(true);
      } else if (reset) {
        setComplete(true);
        setError("Mot de passe modifié. Vous pouvez vous connecter.");
      } else if (verify) {
        setComplete(true);
        setError("Adresse vérifiée. Vous pouvez revenir à votre espace.");
      } else onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <aside>
        <Link href="/" className="brand">
          <img src="/assets/logo-white-crop.svg" alt="SALI DigiCom" />
          <span>PopCard.</span>
        </Link>
        <h1>Votre prochain contact mérite de durer.</h1>
        <p>Une carte. Un mini-site. Toute votre identité professionnelle.</p>
        <CardPreview
          data={{
            ...defaults,
            tpl: "C",
            firstName: "Votre",
            lastName: "identité",
            title: "Votre univers professionnel",
          }}
          watermark={false}
        />
      </aside>
      <main>
        <Link href="/">← Retour à l’accueil</Link>
        <h1>
          {register
            ? "Bienvenue chez PopCard."
            : forgot
              ? "Un nouveau départ."
              : reset
                ? "Votre nouveau mot de passe."
                : verify
                  ? "Vérifiez votre adresse."
                  : "Heureux de vous retrouver."}
        </h1>
        <p>
          {register
            ? "Créez votre compte, puis avancez étape par étape."
            : verify
              ? "Validez le lien reçu pour pouvoir commander."
              : "Accédez à votre espace personnel."}
        </p>
        <Message text={error} />
        {!complete && (
          <form onSubmit={submit}>
            {register && (
              <Field
                label="Nom complet"
                name="name"
                required
                maxLength={100}
                autoComplete="name"
              />
            )}
            {!verify && !reset && (
              <Field
                label="Adresse e-mail"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            )}
            {!verify && !forgot && (
              <Field
                label="Mot de passe"
                name="password"
                type="password"
                required
                minLength={register || reset ? 10 : undefined}
                maxLength={128}
                autoComplete={
                  register || reset ? "new-password" : "current-password"
                }
              />
            )}{" "}
            {(register || reset) && (
              <>
                <small>10 caractères minimum, avec lettres et chiffres.</small>
                <Field
                  label="Confirmer le mot de passe"
                  name="confirmation"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                />
              </>
            )}
            {register && (
              <label className="check">
                <input type="checkbox" name="terms" required />
                J’accepte les{" "}
                <Link href="/conditions">conditions et la confidentialité</Link>
                .
              </label>
            )}
            <button className="button primary" disabled={busy}>
              {busy
                ? "Un instant…"
                : register
                  ? "Créer mon compte"
                  : forgot
                    ? "Préparer le lien"
                    : reset
                      ? "Enregistrer mon mot de passe"
                      : verify
                        ? "Vérifier mon adresse"
                        : "Se connecter"}{" "}
              ↗
            </button>
          </form>
        )}
        <div className="auth-links">
          {register ? (
            <Link href="/connexion">Déjà inscrit ? Se connecter</Link>
          ) : (
            <Link href="/inscription">Créer un compte</Link>
          )}
          <Link href={complete && verify ? "/app" : "/connexion"}>
            {complete && verify ? "Accéder à mon espace" : "Connexion"}
          </Link>
          {!register && !forgot && !reset && !verify && (
            <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          )}
        </div>
      </main>
    </div>
  );
}
function Dashboard() {
  const [cards, setCards] = useState<any[]>([]),
    [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api("cards"), api("orders")])
      .then(([c, o]) => {
        setCards(c);
        setOrders(o);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Heading
        eyebrow="VOTRE ESPACE POPCARD"
        title="Tout commence par une rencontre."
      >
        Retrouvez vos cartes et suivez vos commandes en un coup d’œil.
      </Heading>
      <Message text={error} />
      <div className="stats">
        {[
          ["Mes PopCards", cards.length],
          [
            "Mini-sites publiés",
            cards.filter((c) => c.status === "live").length,
          ],
          [
            "Commandes en cours",
            orders.filter((o) => !["delivered", "rejected"].includes(o.status))
              .length,
          ],
        ].map(([l, n]) => (
          <article key={l}>
            <span>{l}</span>
            <strong>{n}</strong>
          </article>
        ))}
      </div>
      <div className="section-heading">
        <h2>Mes dernières PopCards</h2>
        <Link href="/app/cards">Tout voir ↗</Link>
      </div>
      {cards.length ? (
        <div className="cardgrid">
          {cards.slice(0, 3).map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      ) : (
        <Empty
          title="Votre première PopCard vous attend."
          text="Choisissez votre modèle et construisez votre présence professionnelle."
          href="/app/cards/new"
          action="Créer ma PopCard"
        />
      )}
      <div className="section-heading">
        <h2>Suivi des commandes</h2>
        <Link href="/app/orders">Tout voir ↗</Link>
      </div>
      <OrderTable orders={orders.slice(0, 5)} />
    </>
  );
}
function Empty({ title, text, href, action }: any) {
  return (
    <div className="empty">
      <span>✦</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {href && (
        <Link className="button primary" href={href}>
          {action} ↗
        </Link>
      )}
    </div>
  );
}
function CardTile({ card: c }: any) {
  return (
    <article className="cardtile">
      <CardPreview
        data={c.data}
        logo={logo(c)}
        watermark={c.status !== "live"}
        url={
          typeof location !== "undefined"
            ? location.origin + "/p/" + c.slug
            : undefined
        }
      />
      <div>
        <span className="badge">
          {c.status === "live"
            ? "Publiée"
            : c.status === "suspended"
              ? "Suspendue"
              : "Brouillon"}
        </span>
        <h3>{title(c)}</h3>
        <p>{c.data.company || "Votre identité professionnelle"}</p>
        <Link className="button outline small" href={"/app/cards/" + c.id}>
          Modifier et prévisualiser
        </Link>
        {c.status === "live" && (
          <Link className="textlink" href={"/p/" + c.slug} target="_blank">
            Voir mon mini-site ↗
          </Link>
        )}
      </div>
    </article>
  );
}
function Cards() {
  const [cards, setCards] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api("cards")
      .then(setCards)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Heading eyebrow="VOTRE COLLECTION" title="Mes PopCards.">
        Une carte pour chaque identité professionnelle.
      </Heading>
      <Message text={error} />
      <div className="cardgrid">
        {cards.map((c) => (
          <CardTile key={c.id} card={c} />
        ))}
        <Link className="create-tile" href="/app/cards/new">
          <b>+</b>Créer une nouvelle PopCard
        </Link>
      </div>
    </>
  );
}
function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api("orders")
      .then(setOrders)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Heading eyebrow="DU VIREMENT À LA LIVRAISON" title="Mes commandes.">
        Paiement, suivi et facture regroupés au même endroit.
      </Heading>
      <Message text={error} />
      <OrderTable orders={orders} />
    </>
  );
}
function OrderTable({ orders }: any) {
  return orders.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Commande</th>
            <th>Date</th>
            <th>Quantité</th>
            <th>Montant</th>
            <th>État</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o: any) => (
            <tr key={o.id}>
              <td>
                <b>{o.reference}</b>
              </td>
              <td>{date(o.created_at)}</td>
              <td>{o.quantity}</td>
              <td>{money(o.amount)}</td>
              <td>
                <span className={"badge " + o.status}>
                  {(labels as any)[o.status]}
                </span>
              </td>
              <td>
                <Link href={"/app/orders/" + o.id}>Consulter ↗</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      title="Aucune commande pour le moment."
      text="Vos commandes apparaîtront ici après votre création."
    />
  );
}
function Editor({ id }: any) {
  const router = useRouter();
  const [card, setCard] = useState<any>(null),
    [d, setD] = useState<any>(structuredClone(defaults)),
    [step, setStep] = useState(0),
    [side, setSide] = useState("recto"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [originalFile, setOriginalFile] = useState<File | null>(null),
    [localLogo, setLocalLogo] = useState<string>(),
    [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (id)
      api("cards/" + id)
        .then((c) => {
          setCard(c);
          setD({ ...defaults, ...c.data });
        })
        .catch((e) => setError(e.message));
  }, [id]);
  useEffect(
    () => () => {
      if (localLogo) URL.revokeObjectURL(localLogo);
    },
    [localLogo],
  );
  const locked =
    card &&
    (card.identity_locked || ["live", "suspended"].includes(card.status));
  const field = (key: string, label: string, type = "text") => (
    <Field
      label={label}
      type={type}
      value={d[key]}
      maxLength={key === "desc" ? 2000 : key === "address" ? 500 : 250}
      onChange={(e: any) => setD({ ...d, [key]: e.target.value })}
    />
  );
  const save = async (go = false) => {
    setBusy(true);
    setError("");
    try {
      let c = await api(card ? "cards/" + card.id : "cards", d);
      if (file) {
        const f = new FormData();
        f.set("file", file);
        if (originalFile) f.set("original", originalFile);
        const r = await api("cards/" + c.id + "/logo", f);
        c = { ...c, logo_id: r.logo_id, original_logo_id: r.original_logo_id };
        setFile(null);
      }
      setCard(c);
      setError("Brouillon enregistré.");
      if (go) router.push("/app/cards/" + c.id + "/checkout");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        eyebrow="LE GÉNÉRATEUR POPCARD"
        title={locked ? "Actualisez votre mini-site." : "Créons votre PopCard."}
      >
        Personnalisez à votre rythme. Votre aperçu suit chaque modification.
      </Heading>
      <div className="wizardbar">
        {["Modèle", "Identité visuelle", "Informations", "Aperçu"].map(
          (t, i) => (
            <button
              className={step === i ? "active" : ""}
              onClick={() => setStep(i)}
              key={t}
            >
              <b>{i + 1}</b>
              <span>{t}</span>
            </button>
          ),
        )}
      </div>
      <div className="editorgrid">
        <section className="panel">
          <span className="eyebrow">ÉTAPE 0{step + 1}</span>
          {step === 0 && (
            <>
              <h2>Choisissez votre modèle.</h2>
              <p>
                Le recto présente votre identité. Le verso ouvre votre
                mini-site.
              </p>
              <div className="templatechoices">
                {[
                  ["A", "Logo", "Votre marque au premier plan"],
                  ["B", "Carte de visite", "Nom, fonction et coordonnées"],
                  ["C", "Épuré", "Une composition minimaliste"],
                ].map(([v, t, s]) => (
                  <button
                    disabled={locked}
                    key={v}
                    onClick={() => setD({ ...d, tpl: v })}
                    className={d.tpl === v ? "selected" : ""}
                  >
                    <strong>{t}</strong>
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2>À votre image.</h2>
              {locked && (
                <Message text="L’identité utilisée dans une commande est verrouillée. Vous pouvez modifier vos coordonnées à l’étape suivante." />
              )}
              <LogoStudio
                initialResult={localLogo || logo(card || {})}
                disabled={locked}
                initialLogo={
                  card?.original_logo_id
                    ? "/api/files/" + card.original_logo_id
                    : undefined
                }
                onLogo={(f: File, url: string, original: File) => {
                  setOriginalFile(original);
                  setFile(f);
                  setLocalLogo(url);
                }}
                onPalette={(g: any) =>
                  setD({
                    ...d,
                    primary: g.primary,
                    accent: g.accent,
                    background: g.background,
                    ...(g.logoTile === undefined
                      ? {}
                      : { logoTile: g.logoTile }),
                  })
                }
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={d.logoTile}
                  disabled={locked}
                  onChange={(e) => setD({ ...d, logoTile: e.target.checked })}
                />
                Pastille blanche derrière le logo
              </label>
              <div className="two-cols">
                {["primary", "accent", "background"].map((k, i) => (
                  <Field
                    key={k}
                    label={
                      [
                        "Couleur principale",
                        "Couleur d’accent",
                        "Couleur de fond",
                      ][i]
                    }
                    type="color"
                    value={d[k]}
                    disabled={locked}
                    onChange={(e: any) => setD({ ...d, [k]: e.target.value })}
                  />
                ))}
              </div>
              <div className="two-cols">
                {["fontTitle", "fontBody"].map((k, i) => (
                  <label className="field" key={k}>
                    {i ? "Police des textes" : "Police des titres"}
                    <select
                      disabled={locked}
                      value={d[k]}
                      onChange={(e) => setD({ ...d, [k]: e.target.value })}
                    >
                      {[
                        "Montserrat",
                        "Open Sans",
                        "Cormorant Garamond",
                        "Poppins",
                      ].map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Faisons connaissance.</h2>
              <div className="two-cols">
                {field("firstName", "Prénom")}
                {field("lastName", "Nom")}
              </div>
              {field("title", "Fonction")}
              {field("company", "Société")}
              {field("city", "Ville")}
              <label className="field">
                Description
                <textarea
                  value={d.desc}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => setD({ ...d, desc: e.target.value })}
                />
              </label>
              <label className="field">
                Langue du mini-site
                <select
                  value={d.lang}
                  onChange={(e) => setD({ ...d, lang: e.target.value })}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </label>
              <h3>Vos coordonnées</h3>
              {d.phones.map((p: any, i: number) => (
                <div className="repeat-row" key={i}>
                  <input
                    aria-label="Libellé téléphone"
                    value={p[0]}
                    onChange={(e) =>
                      setD({
                        ...d,
                        phones: d.phones.map((v: any, n: number) =>
                          n === i ? [e.target.value, v[1]] : v,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label="Téléphone"
                    type="tel"
                    value={p[1]}
                    onChange={(e) =>
                      setD({
                        ...d,
                        phones: d.phones.map((v: any, n: number) =>
                          n === i ? [v[0], e.target.value] : v,
                        ),
                      })
                    }
                  />
                  <button
                    onClick={() =>
                      setD({
                        ...d,
                        phones: d.phones.filter((_: any, n: number) => n !== i),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              {d.phones.length < 5 && (
                <button
                  className="textlink"
                  onClick={() =>
                    setD({ ...d, phones: [...d.phones, ["Mobile", ""]] })
                  }
                >
                  + Ajouter un téléphone
                </button>
              )}
              {d.emails.map((v: string, i: number) => (
                <div className="repeat-row" key={i}>
                  <input
                    aria-label="E-mail"
                    type="email"
                    value={v}
                    onChange={(e) =>
                      setD({
                        ...d,
                        emails: d.emails.map((x: string, n: number) =>
                          i === n ? e.target.value : x,
                        ),
                      })
                    }
                  />
                  <button
                    onClick={() =>
                      setD({
                        ...d,
                        emails: d.emails.filter((_: any, n: number) => n !== i),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              {d.emails.length < 5 && (
                <button
                  className="textlink"
                  onClick={() => setD({ ...d, emails: [...d.emails, ""] })}
                >
                  + Ajouter un e-mail
                </button>
              )}
              {field("whatsapp", "WhatsApp", "tel")}
              {field("website", "Site web · URL https://")}
              {field("address", "Adresse")}
              {field("instagram", "Instagram · URL https://")}
              {field("linkedin", "LinkedIn · URL https://")}
              {field("facebook", "Facebook · URL https://")}
              <h3>Sections visibles</h3>
              {Object.keys(d.show).map((k) => (
                <label className="check" key={k}>
                  <input
                    type="checkbox"
                    checked={d.show[k]}
                    onChange={(e) =>
                      setD({ ...d, show: { ...d.show, [k]: e.target.checked } })
                    }
                  />
                  {{
                    desc: "Description",
                    phones: "Téléphones",
                    emails: "E-mails",
                    whatsapp: "WhatsApp",
                    website: "Site web",
                    address: "Adresse",
                    social: "Réseaux sociaux",
                  }[k] || k}
                </label>
              ))}
            </>
          )}
          {step === 3 && (
            <>
              <h2>Le dernier coup d’œil.</h2>
              <p>Vérifiez les deux faces et le mini-site avant de commander.</p>
              <Message text="Votre aperçu reste privé. Le lien public sera activé à la fin de la production." />
              <label className="check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                J’ai vérifié mes aperçus et mes coordonnées.
              </label>
            </>
          )}
          <Message text={error} />
          <div className="wizardactions">
            <button
              className="button outline"
              disabled={step === 0 || busy}
              onClick={() => setStep(step - 1)}
            >
              Précédent
            </button>
            <button
              className="button outline"
              disabled={busy}
              onClick={() => save()}
            >
              Enregistrer
            </button>
            {step < 3 ? (
              <button
                className="button primary"
                onClick={() => setStep(step + 1)}
              >
                Continuer
              </button>
            ) : (
              <button
                className="button primary"
                disabled={busy || !confirmed}
                onClick={() => save(true)}
              >
                {locked ? "Recommander" : "Commander"} ↗
              </button>
            )}
          </div>
        </section>
        <aside className="previewpanel">
          <div className="previewtabs">
            {["recto", "verso", "site"].map((s) => (
              <button
                key={s}
                className={side === s ? "active" : ""}
                onClick={() => setSide(s)}
              >
                {s === "site" ? "Mini-site" : s}
              </button>
            ))}
          </div>
          {side === "site" ? (
            <MiniSite
              data={d}
              logo={localLogo || logo(card || {})}
              watermark
              placeholders
            />
          ) : (
            <CardPreview
              data={d}
              logo={localLogo || logo(card || {})}
              side={side}
              url={card ? location.origin + "/p/" + card.slug : undefined}
            />
          )}
          <small>APERÇU PRIVÉ · 85,6 × 54 mm</small>
          {card && (
            <button
              className="button outline"
              disabled={busy || !!file}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("cards/" + card.id, d);
                  const r = await api(
                    "cards/" + card.id + "/share-preview",
                    {},
                  );
                  setError(
                    r.status === "sent"
                      ? "Aperçu envoyé par email. Le lien expire dans 7 jours."
                      : r.status === "failed"
                        ? "L’envoi a échoué. Vérifiez la configuration SMTP."
                        : "Aperçu enregistré dans le journal des emails. Configurez le SMTP pour l’envoi réel.",
                  );
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Envoyer mon aperçu par email
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
function Checkout({ id, user, config }: any) {
  const router = useRouter();
  const [card, setCard] = useState<any>(),
    [q, setQ] = useState(1),
    [country, setCountry] = useState("Maroc"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("cards/" + id)
      .then(setCard)
      .catch((e) => setError(e.message));
  }, [id]);
  const submit = async (e: any) => {
    e.preventDefault();
    setBusy(true);
    try {
      const f = new FormData(e.currentTarget);
      const o = await api("orders", {
        ...Object.fromEntries(f),
        card_id: id,
        quantity: q,
        country,
        rights: f.get("rights") === "on",
        terms: f.get("terms") === "on",
      });
      router.push("/app/orders/" + o.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading eyebrow="VOTRE COMMANDE" title="Prêt à faire bonne impression ?">
        Confirmez les informations de facturation et de livraison.
      </Heading>
      <Message text={error} />
      {!config?.ordersEnabled && (
        <Message text="Les commandes ouvriront après configuration des coordonnées bancaires par SALI. Vous pouvez continuer à préparer vos cartes." />
      )}
      <div className="editorgrid">
        <form className="panel" onSubmit={submit}>
          <div className="two-cols">
            <Field
              label="Quantité"
              type="number"
              min={1}
              max={500}
              value={q}
              onChange={(e: any) => setQ(Number(e.target.value))}
            />
            <label className="field">
              Pays de livraison
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {[
                  "Maroc",
                  "France",
                  "Belgique",
                  "Côte d’Ivoire",
                  "Sénégal",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            Facturation
            <select name="billing_type">
              <option value="person">Particulier</option>
              <option value="company">Entreprise</option>
            </select>
          </label>
          <Field
            label="Nom de facturation"
            name="billing_name"
            required
            defaultValue={user.profile?.billing_name || user.name}
          />
          <Field
            label="ICE · 15 chiffres pour une entreprise"
            name="ice"
            maxLength={15}
            defaultValue={user.profile?.ice || ""}
          />
          <Field
            label="Adresse complète de livraison"
            name="address"
            required
            minLength={5}
            defaultValue={user.profile?.address || ""}
          />
          <label className="check">
            <input name="rights" type="checkbox" required />
            Je dispose des droits sur les logos, textes et images fournis.
          </label>
          <label className="check">
            <input name="terms" type="checkbox" required />
            J’ai vérifié les informations et j’accepte les{" "}
            <Link href="/conditions">conditions</Link>.
          </label>
          <button
            className="button primary"
            disabled={busy || !config?.ordersEnabled || !user.verified_at}
          >
            Enregistrer et passer au virement ↗
          </button>
        </form>
        <aside className="panel">
          {card && <CardPreview data={card.data} logo={logo(card)} />}
          <h2>Récapitulatif</h2>
          <p>
            {q} carte{q > 1 ? "s" : ""}
          </p>
          <p>
            Livraison :{" "}
            {money(
              country === "Maroc"
                ? config?.shippingMA || 0
                : config?.shippingINT || 0,
            )}
          </p>
          <strong className="total">
            {q >= 1 && q <= 500
              ? money(
                  price(
                    q,
                    card && ["live", "suspended"].includes(card.status),
                    country === "Maroc"
                      ? config?.shippingMA || 0
                      : config?.shippingINT || 0,
                  ),
                )
              : "Quantité invalide"}
          </strong>
          <p>
            Le montant est confirmé côté serveur. Le dépôt du reçu ne valide pas
            automatiquement le paiement.
          </p>
        </aside>
      </div>
    </>
  );
}
function OrderDetail({ id, config }: any) {
  const [o, setO] = useState<any>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    api("orders/" + id)
      .then(setO)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [id]);
  const upload = async (e: any) => {
    e.preventDefault();
    setBusy(true);
    try {
      const f = new FormData();
      f.set("file", new FormData(e.currentTarget).get("file")!);
      await api("orders/" + id + "/receipt", f);
      setError("Justificatif reçu. SALI va vérifier le versement.");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (!o) return <Message text={error || "Chargement de la commande…"} />;
  return (
    <>
      <Heading eyebrow="SUIVI DE COMMANDE" title={o.reference}>
        {(labels as any)[o.status]} · {money(o.amount)}
      </Heading>
      <Message text={error} />
      <div className="editorgrid">
        <section className="panel">
          <h2>Votre commande</h2>
          <p>
            {o.quantity} carte(s) · {date(o.created_at)}
          </p>
          <p>Facturation : {o.billing.name}</p>
          <p>
            Livraison : {o.delivery.address}, {o.delivery.country}
          </p>
          {o.tracking && (
            <p>
              <b>Suivi : {o.tracking}</b>
            </p>
          )}
          {o.note && <Message text={o.note} />}
          <CardPreview
            data={o.snapshot}
            logo={
              o.snapshot.logo_id
                ? "/api/files/" + o.snapshot.logo_id
                : undefined
            }
          />
          <h3>Historique</h3>
          {o.events?.map((e: any) => (
            <div className="event" key={e.id}>
              <span>{date(e.created_at)}</span>
              <b>{(labels as any)[e.status]}</b>
              <p>{e.message}</p>
            </div>
          ))}
          {o.paid_at && config?.invoicesEnabled && (
            <button className="button outline" onClick={() => window.print()}>
              Télécharger la facture / PDF
            </button>
          )}
          {o.paid_at && !config?.invoicesEnabled && (
            <p>
              La facture sera disponible après configuration des mentions
              légales par SALI.
            </p>
          )}
          {o.paid_at && config?.invoicesEnabled && (
            <div className="invoice-print">
              <h1>Facture · {o.reference}</h1>
              <p>
                SALI DigiCom · {config?.companyAddress} · ICE{" "}
                {config?.companyICE}
              </p>
              <p>
                Client : {o.billing.name} · ICE {o.billing.ice}
              </p>
              <p>
                {o.quantity} PopCard(s) · Total {money(o.amount)} · Payée le{" "}
                {date(o.paid_at)}
              </p>
            </div>
          )}
        </section>
        <aside className="panel">
          {["awaiting_receipt", "review", "rejected"].includes(o.status) ? (
            <>
              <h2>Paiement par virement</h2>
              {[
                ["Banque", config?.bank?.name],
                ["Titulaire", config?.bank?.holder],
                ["RIB", config?.bank?.rib],
                ["IBAN", config?.bank?.iban],
                ["SWIFT", config?.bank?.swift],
              ].map(
                ([l, v]) =>
                  v && (
                    <div className="bankline" key={l}>
                      <small>{l}</small>
                      <b>{v}</b>
                      <button
                        onClick={() =>
                          navigator.clipboard
                            .writeText(v)
                            .then(() => setError(l + " copié."))
                            .catch(() =>
                              setError("Sélectionnez le texte pour le copier."),
                            )
                        }
                      >
                        Copier
                      </button>
                    </div>
                  ),
              )}
              <p>
                Référence à indiquer : <b>{o.reference}</b>
              </p>
              <p>
                Montant : <b>{money(o.amount)}</b>
              </p>
              <form onSubmit={upload}>
                <Field
                  label="Déposer le justificatif · PDF, JPG, PNG, WebP · 3 Mo"
                  type="file"
                  name="file"
                  required
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                />
                <button className="button primary" disabled={busy}>
                  Envoyer le justificatif
                </button>
              </form>
              {o.receipt_id && (
                <a
                  className="textlink"
                  href={"/api/files/" + o.receipt_id}
                  target="_blank"
                >
                  Consulter mon justificatif ↗
                </a>
              )}
              <Message
                text={"Délai indicatif de vérification : " + config?.delay}
              />
            </>
          ) : (
            <>
              <h2>Votre commande avance.</h2>
              <p>
                Vous pouvez revenir à la vue d’ensemble. Chaque étape reste
                visible ici.
              </p>
              <Link className="button primary" href="/app">
                Revenir à mon espace
              </Link>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
function Profile({ user, refresh }: any) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <Heading eyebrow="VOS INFORMATIONS" title="Profil et facturation." />
      <form
        className="panel narrow"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(
              "profile",
              Object.fromEntries(new FormData(e.currentTarget)),
            );
            setMessage("Profil enregistré.");
            refresh();
          } catch (e: any) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field
          label="Nom complet"
          name="name"
          required
          defaultValue={user.name}
        />
        <Field
          label="Adresse e-mail"
          name="email"
          type="email"
          required
          defaultValue={user.email}
        />
        <Field
          label="Mot de passe actuel · requis pour changer l’e-mail"
          name="current_password"
          type="password"
        />
        <Field
          label="Nom de facturation"
          name="billing_name"
          defaultValue={user.profile?.billing_name || ""}
        />
        <Field
          label="ICE"
          name="ice"
          maxLength={15}
          defaultValue={user.profile?.ice || ""}
        />
        <Field
          label="Adresse"
          name="address"
          defaultValue={user.profile?.address || ""}
        />
        <Message text={message} />
        <button className="button primary" disabled={busy}>
          Enregistrer
        </button>
      </form>
    </>
  );
}
function Account() {
  const [message, setMessage] = useState("");
  return (
    <>
      <Heading eyebrow="SÉCURITÉ" title="Mon compte." />
      <form
        className="panel narrow"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = e.currentTarget;
          try {
            await api("password", Object.fromEntries(new FormData(f)));
            setMessage(
              "Mot de passe modifié. Les autres sessions ont été fermées.",
            );
            f.reset();
          } catch (e: any) {
            setMessage(e.message);
          }
        }}
      >
        <h2>Changer le mot de passe</h2>
        <Field
          label="Mot de passe actuel"
          name="current_password"
          type="password"
          required
        />
        <Field
          label="Nouveau mot de passe · 10 caractères, lettres et chiffres"
          name="password"
          type="password"
          required
          minLength={10}
        />
        <Field
          label="Confirmer le nouveau mot de passe"
          name="confirmation"
          type="password"
          required
        />
        <Message text={message} />
        <button className="button primary">Modifier mon mot de passe</button>
      </form>
    </>
  );
}
function Help() {
  return (
    <>
      <Heading eyebrow="ON VOUS ACCOMPAGNE" title="Un coup de main ?">
        Tout ce qu’il faut pour démarrer simplement.
      </Heading>
      <div className="helpgrid">
        {[
          [
            "1. Préparer ma carte",
            "Créez une PopCard, choisissez un modèle et personnalisez le logo, les couleurs et les coordonnées. Enregistrez votre brouillon avant de quitter.",
          ],
          [
            "2. Vérifier mes aperçus",
            "Les onglets Recto, Verso et Mini-site montrent le résultat. Le filigrane indique que la page est encore privée.",
          ],
          [
            "3. Commander et payer",
            "Vérifiez votre e-mail, confirmez la livraison et la facturation. Effectuez le virement avec la référence de commande et déposez le reçu.",
          ],
          [
            "4. Suivre la production",
            "Le reçu est vérifié manuellement. La commande passe ensuite en production puis en expédition. Le mini-site devient public à la fin de la production.",
          ],
          [
            "5. Modifier après publication",
            "Les coordonnées du mini-site restent modifiables. Le logo, les couleurs et le modèle imprimés sont verrouillés.",
          ],
          [
            "Le logo et ses couleurs",
            "Importez une seule fois votre logo en PNG, JPEG, SVG ou PDF. Une palette applique ensemble la couleur principale, le fond et l’accent. La transparence d’un fond uni reste réversible ; vérifiez les contours.",
          ],
          [
            "Partager un aperçu",
            "Enregistrez votre brouillon puis cliquez sur Envoyer mon aperçu par email. Le lien privé expire dans sept jours. Son destinataire peut consulter le recto, le verso et le mini-site avec filigrane.",
          ],
          [
            "6. Contacter SALI",
            "Besoin d’aide ? Écrivez à contact@sali-digicom.com en indiquant votre référence de commande.",
          ],
        ].map(([t, p]) => (
          <article className="panel" key={t}>
            <h3>{t}</h3>
            <p>{p}</p>
          </article>
        ))}
      </div>
    </>
  );
}
function Public({ slug }: any) {
  const [card, setCard] = useState<any>(),
    [error, setError] = useState("");
  useEffect(() => {
    api("public/" + slug)
      .then(setCard)
      .catch((e) => setError(e.message));
  }, [slug]);
  return (
    <div className="public-page">
      {card ? (
        <MiniSite data={card.data} logo={logo(card)} />
      ) : (
        <div className="document">
          <h1>{error || "Chargement…"}</h1>
        </div>
      )}
    </div>
  );
}
function Admin() {
  const [tab, setTab] = useState("orders"),
    [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<any>();
  const load = () =>
    api("admin/" + tab)
      .then(setRows)
      .catch((e) => setError(e.message));
  useEffect(() => {
    setSelected(undefined);
    load();
  }, [tab]);
  return (
    <>
      <Heading
        eyebrow="SALI DIGICOM · ADMINISTRATION"
        title="Le cockpit PopCard."
      >
        Vérifiez les paiements, pilotez la production et accompagnez les
        clients.
      </Heading>
      <div className="previewtabs">
        {[
          ["orders", "Commandes"],
          ["cards", "PopCards"],
          ["users", "Clients"],
          ["mail", "Journal des emails"],
        ].map(([v, l]) => (
          <button
            className={tab === v ? "active" : ""}
            key={v}
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
      </div>
      <Message text={error} />
      {tab === "orders" ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Montant</th>
                  <th>État</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>{o.reference}</td>
                    <td>
                      {o.customer_name}
                      <small>{o.customer_email}</small>
                    </td>
                    <td>{money(o.amount)}</td>
                    <td>{(labels as any)[o.status]}</td>
                    <td>
                      <button onClick={() => setSelected(o)}>Traiter ↗</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected && (
            <form
              key={selected.id}
              className="panel"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  await api("admin/orders/" + selected.id, {
                    ...Object.fromEntries(f),
                    bank_confirmed: f.get("bank_confirmed") === "on",
                    rights_confirmed: f.get("rights_confirmed") === "on",
                  });
                  setError("Commande mise à jour.");
                  setSelected(undefined);
                  load();
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              <h2>
                {selected.reference} · {selected.customer_name}
              </h2>
              {selected.paid_at && (
                <Link
                  className="button outline"
                  href={"/production/" + selected.id}
                  target="_blank"
                >
                  Ouvrir le recto-verso de production ↗
                </Link>
              )}
              <CardPreview
                data={selected.snapshot}
                logo={
                  selected.snapshot.logo_id
                    ? "/api/files/" + selected.snapshot.logo_id
                    : undefined
                }
              />
              <p>
                Facturation : {selected.billing.name} · ICE{" "}
                {selected.billing.ice}
              </p>
              <p>
                Livraison : {selected.delivery.address},{" "}
                {selected.delivery.country}
              </p>
              {selected.receipt_id && (
                <a
                  className="button outline"
                  href={"/api/files/" + selected.receipt_id}
                  target="_blank"
                >
                  Télécharger le justificatif
                </a>
              )}
              <label className="field">
                Prochaine étape
                <select name="status">
                  {((transitions as any)[selected.status] || []).map(
                    (s: string) => (
                      <option key={s} value={s}>
                        {(labels as any)[s]}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" name="bank_confirmed" />
                J’ai confirmé la réception du versement sur le compte bancaire.
              </label>
              <label className="check">
                <input type="checkbox" name="rights_confirmed" />
                Les informations et droits d’utilisation ont été vérifiés.
              </label>
              <Field
                label="Numéro de suivi · requis pour expédier"
                name="tracking"
                defaultValue={selected.tracking || ""}
              />
              <Field label="Note au client" name="note" defaultValue="" />
              <button
                className="button primary"
                disabled={!((transitions as any)[selected.status] || []).length}
              >
                Mettre à jour
              </button>
              <button
                type="button"
                className="button outline"
                onClick={() => setSelected(undefined)}
              >
                Fermer
              </button>
            </form>
          )}
        </>
      ) : tab === "cards" ? (
        <div className="cardgrid">
          {rows.map((c) => (
            <article className="panel" key={c.id}>
              <CardPreview data={c.data} logo={logo(c)} />
              <h3>{title(c)}</h3>
              <p>{c.status}</p>
              {["live", "suspended"].includes(c.status) && (
                <button
                  onClick={async () => {
                    try {
                      await api("admin/cards/" + c.id, {
                        status: c.status === "live" ? "suspended" : "live",
                      });
                      load();
                    } catch (e: any) {
                      setError(e.message);
                    }
                  }}
                >
                  {c.status === "live" ? "Suspendre" : "Réactiver"}
                </button>
              )}
            </article>
          ))}
        </div>
      ) : tab === "users" ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Vérification</th>
                <th>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.verified_at ? "Vérifié" : "En attente"}</td>
                  <td>{u.is_admin ? "Administrateur" : "Client"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <Message text="En mode log, les emails ne sont pas envoyés. Les liens de test se trouvent ici. Ce journal est réservé aux administrateurs." />
          {rows.map((m) => (
            <details className="panel" key={m.id}>
              <summary>
                {m.subject} · {m.recipient} · {m.status}
              </summary>
              <p className="mail-body">
                {m.body
                  .split(/(https?:\/\/\S+)/g)
                  .map((s: string, i: number) =>
                    s.startsWith("http") ? (
                      <a key={i} href={s}>
                        {s}
                      </a>
                    ) : (
                      s
                    ),
                  )}
              </p>
              <small>{date(m.created_at)}</small>
            </details>
          ))}
        </>
      )}
    </>
  );
}

function Production({ id }: any) {
  const [o, setO] = useState<any>(),
    [error, setError] = useState("");
  useEffect(() => {
    api("admin/orders/" + id)
      .then(setO)
      .catch((e) => setError(e.message));
  }, [id]);
  if (!o)
    return (
      <div className="document">
        <Message text={error || "Chargement…"} />
      </div>
    );
  return (
    <main className="production-sheet">
      <div className="production-controls">
        <h1>Production · {o.reference}</h1>
        <p>
          85,6 × 54 mm. Impression à 100 %, sans marges ni en-têtes du
          navigateur. Vérifiez le QR sur une épreuve avant fabrication.
        </p>
        <button className="button primary" onClick={() => window.print()}>
          Imprimer / enregistrer en PDF
        </button>
      </div>
      <div className="production-faces">
        <CardPreview
          data={o.snapshot}
          logo={
            o.snapshot.logo_id ? "/api/files/" + o.snapshot.logo_id : undefined
          }
          watermark={false}
        />
        <CardPreview
          data={o.snapshot}
          logo={
            o.snapshot.logo_id ? "/api/files/" + o.snapshot.logo_id : undefined
          }
          side="verso"
          watermark={false}
          url={location.origin + "/p/" + o.slug}
        />
      </div>
    </main>
  );
}

function SharedPreview() {
  const [card, setCard] = useState<any>(null),
    [error, setError] = useState(""),
    [side, setSide] = useState("recto");
  useEffect(() => {
    const token = new URLSearchParams(location.search).get("token");
    api("preview/" + token)
      .then(setCard)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="document">
      <h1>Votre aperçu PopCard</h1>
      <p>
        Aperçu privé avec filigrane. Ce lien ne rend pas le mini-site public.
      </p>
      {error && <Message text={error} />}
      {card && (
        <>
          <div className="previewtabs">
            {["recto", "verso", "site"].map((s) => (
              <button key={s} onClick={() => setSide(s)}>
                {s === "site" ? "Mini-site" : s}
              </button>
            ))}
          </div>
          {side === "site" ? (
            <MiniSite data={card.data} logo={card.logo} watermark />
          ) : (
            <CardPreview
              data={card.data}
              logo={card.logo}
              side={side}
              watermark
              url={location.origin + "/p/" + card.slug}
            />
          )}
        </>
      )}
    </main>
  );
}
