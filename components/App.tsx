"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import useCardDraft from "./useCardDraft";
import { flushActiveDraft, recoverableDrafts } from "@/lib/draft-storage";
import { api } from "@/lib/client-api";
export { api } from "@/lib/client-api";
import Link from "next/link";
import Landing from "./Landing";
import LogoStudio from "./LogoStudio";
import FontLibrary from "./FontLibrary";
import { cardIssues } from "@/lib/card-validation.mjs";
import { CardPreview, MiniSite, Icon, defaults } from "./Preview";
import { labels, price, transitions } from "@/lib/business.mjs";
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
export default function App() {
  const path = usePathname() || "/";
  const router = useRouter();
  const [user, setUser] = useState<any>(undefined);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const mq = matchMedia("(max-width: 800px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!menu || !mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [menu, mobile]);
  const refresh = () =>
    api("me")
      .then(setUser)
      .catch(() => setUser(null));
  useEffect(() => {
    setMenu(false);
  }, [path]);
  useEffect(() => {
    refresh();
    api("config")
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, []);
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
        key={path}
        path={path}
        onDone={async () => {
          await refresh();
          router.replace("/app");
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
    ["/app", "dashboard", "Vue d’ensemble"],
    ["/app/cards", "cards", "Mes PopCards"],
    ["/app/orders", "orders", "Mes commandes"],
    ["/app/profile", "user", "Profil et facturation"],
    ["/app/account", "settings", "Mon compte"], // taste-skill-ignore
    ["/app/help", "help", "Aide"],
  ];
  return (
    <div
      className="workspace"
      onClickCapture={async (e) => {
        const anchor = (e.target as HTMLElement).closest(
          "a[href]",
        ) as HTMLAnchorElement | null;
        if (
          !anchor ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          anchor.target ||
          anchor.hasAttribute("download")
        )
          return;
        const next = new URL(anchor.href, location.href);
        if (
          next.origin !== location.origin ||
          next.pathname === location.pathname
        )
          return;
        const pending = flushActiveDraft();
        if (!pending) return;
        e.preventDefault();
        e.stopPropagation();
        try {
          await pending;
        } catch {
          setError(
            "Les dernières saisies restent sur cet appareil. Rouvrez votre brouillon pour les synchroniser.",
          );
        }
        router.push(next.pathname + next.search + next.hash);
      }}
    >
      {menu && mobile && (
        <button
          className="menu-scrim"
          aria-label="Fermer le menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        aria-label="Navigation principale"
        inert={mobile && !menu}
        className={"sidebar " + (menu ? "open" : "")}
      >
        <Link className="brand" href="/">
          <img src="/assets/logo-white-crop.svg" alt="SALI DigiCom" />
          <span>
            PopCard<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="sidebar-scroll">
          <div className="sidebar-caption">MON ESPACE</div>
          <nav>
            {links.map(([href, icon, label]) => (
              <Link
                onClick={() => setMenu(false)}
                aria-current={
                  path === href ||
                  (href !== "/app" && path.startsWith(href + "/"))
                    ? "page"
                    : undefined
                }
                className={
                  path === href ||
                  (href !== "/app" && path.startsWith(href + "/"))
                    ? "active"
                    : ""
                }
                href={href}
                key={href}
              >
                <Icon kind={icon} />
                {label}
              </Link>
            ))}
            {user.is_admin && (
              <Link
                href="/app/admin"
                className={path === "/app/admin" ? "active" : ""}
              >
                <Icon kind="settings" /> Administration
              </Link>
            )}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <b>{user.name}</b>
          <small>{user.email}</small>
          <button
            onClick={async () => {
              try {
                await flushActiveDraft();
              } catch {}
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
          <button
            ref={menuButton}
            className="mobile-menu"
            aria-expanded={menu}
            aria-controls="workspace-navigation"
            onClick={() => setMenu(!menu)}
          >
            ☰ Menu {/* taste-skill-ignore */}
          </button>
          <span className="topbar-location">
            Mon espace <span>/</span>{" "}
            <b>
              {links.find(
                ([href]) =>
                  path === href ||
                  (href !== "/app" && path.startsWith(href + "/")),
              )?.[2] || "Administration"}
            </b>
          </span>
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
            <Dashboard user={user} />
          ) : path === "/app/cards" ? (
            <Cards userId={user.id} />
          ) : path === "/app/cards/new" ||
            /^\/app\/cards\/[^/]+$/.test(path) ? (
            <Editor
              userId={user.id}
              id={path.endsWith("/new") ? undefined : path.split("/")[3]}
            />
          ) : path.includes("/checkout") ? (
            <Checkout
              key={path.split("/")[3]}
              id={path.split("/")[3]}
              user={user}
              config={config}
            />
          ) : path === "/app/orders" ? (
            <Orders />
          ) : path.startsWith("/app/orders/") ? (
            <OrderDetail
              key={path.split("/")[3]}
              id={path.split("/")[3]}
              config={config}
            />
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
      <span className="eyebrow">
        {/* taste-skill-ignore */}
        {eyebrow}
      </span>
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
function LocalDraftNotice({ userId }: { userId: string }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  useEffect(() => {
    const update = () => setDrafts(recoverableDrafts(userId));
    update();
    window.addEventListener("popcard-draft-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("popcard-draft-change", update);
      window.removeEventListener("storage", update);
    };
  }, [userId]);
  return drafts.length ? (
    <aside
      className="local-drafts notice"
      aria-label="Brouillons à synchroniser"
    >
      <b>Des modifications vous attendent sur cet appareil.</b>
      <p>Reprenez votre brouillon pour terminer son enregistrement.</p>
      {drafts.map((draft) => (
        <Link key={draft.key} href={"/app/cards/" + (draft.cardId || "new")}>
          Reprendre{" "}
          {[draft.data.firstName, draft.data.lastName].join(" ").trim() ||
            "mon brouillon"}{" "}
          <Icon kind="arrow" />
        </Link>
      ))}
    </aside>
  ) : null;
}
function Dashboard({ user }: any) {
  const [cards, setCards] = useState<any[]>([]),
    [orders, setOrders] = useState<any[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([api("cards"), api("orders")])
      .then(([c, o]) => {
        if (active) {
          setCards(c);
          setOrders(o);
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);
  const draft = cards.find((c) => c.status === "draft" && !c.identity_locked);
  const preview = draft || cards[0];
  const firstName = user.name.split(" ")[0];
  return (
    <>
      <div className="dashboard-intro">
        <div>
          <h2>Bonjour {firstName}.</h2>
          <p>Vos cartes et vos prochaines rencontres commencent ici.</p>
        </div>
        <span className="dashboard-date">
          {new Intl.DateTimeFormat("fr-MA", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </span>
      </div>
      <Message text={error} />
      <LocalDraftNotice userId={user.id} />
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">VOTRE ESPACE POPCARD</span>
          <h1>
            {draft ? (
              <>
                Votre prochaine carte
                <br />
                prend forme.
              </>
            ) : (
              <>
                Prêt pour votre
                <br />
                prochaine rencontre ?
              </>
            )}
          </h1>
          <p>
            {draft
              ? "Retrouvez votre brouillon, ajustez vos informations et préparez votre commande."
              : "Créez une carte qui vous ressemble et partagez votre activité en un scan."}
          </p>
          <Link
            className="button primary"
            href={draft ? "/app/cards/" + draft.id : "/app/cards/new"}
          >
            {draft ? "Reprendre mon brouillon" : "Créer ma première PopCard"}{" "}
            <Icon kind="arrow" />
          </Link>
        </div>
        <div className="dashboard-card-scene">
          <CardPreview
            data={
              preview?.data || {
                ...defaults,
                primary: "#173E35",
                accent: "#44B68A",
                background: "#FCFBF6",
                firstName: user.name.split(" ")[0],
                lastName: user.name.split(" ").slice(1).join(" "),
                company: "Votre entreprise",
                title: "Votre fonction",
              }
            }
            logo={preview ? logo(preview) : undefined}
            watermark={false}
          />
        </div>
      </section>
      <div className="stats" aria-busy={!loaded}>
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
        ].map(([label, count]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{loaded ? count : "—"}</strong>
          </article>
        ))}
      </div>
      {cards.length ? (
        <>
          <div className="section-heading">
            <h2>Mes dernières PopCards</h2>
            <Link href="/app/cards">Tout voir ↗</Link>
          </div>
          <div className="cardgrid">
            {cards.slice(0, 3).map((c) => (
              <CardTile key={c.id} card={c} />
            ))}
          </div>
        </>
      ) : (
        loaded && (
          <>
            <div className="section-heading">
              <h2>Votre première PopCard, en trois étapes.</h2>
            </div>
            <div className="dashboard-start">
              {[
                [
                  "01",
                  "Choisissez votre modèle",
                  "Votre logo, votre palette et votre style.",
                  "/app/cards/new",
                ],
                [
                  "02",
                  "Renseignez vos informations",
                  "Les coordonnées et liens que vous souhaitez partager.",
                  "/app/cards/new",
                ],
                [
                  "03",
                  "Vérifiez et commandez",
                  "Votre aperçu, puis le suivi de votre fabrication.",
                  "/app/help",
                ],
              ].map(([number, label, text, href]) => (
                <Link key={number} href={href}>
                  <span className="start-number">{number}</span>
                  <b>{label}</b>
                  <p>{text}</p>
                </Link>
              ))}
            </div>
          </>
        )
      )}
      <div className="section-heading">
        <h2>Suivi des commandes</h2>
        <Link href="/app/orders">Tout voir ↗</Link>
      </div>
      {orders.length ? (
        <OrderTable orders={orders.slice(0, 5)} />
      ) : (
        <div className="dashboard-orders-empty">
          <Icon kind="orders" />
          <div>
            <b>
              {loaded
                ? "Vos prochaines commandes seront regroupées ici."
                : "Chargement de vos commandes…"}
            </b>
            <p>
              Paiement, fabrication et livraison : suivez chaque étape depuis
              votre espace.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
function Empty({ title, text, href, action }: any) {
  return (
    <div className="empty">
      <span aria-hidden="true">✦{/* taste-skill-ignore */}</span>
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
function Cards({ userId }: { userId: string }) {
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
      <LocalDraftNotice userId={userId} />
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
function Editor({ id, userId }: any) {
  const router = useRouter();
  const {
    card,
    d,
    setD,
    ready,
    error,
    setError,
    saveStatus,
    busy,
    localLogo,
    storageWarning,
    flush,
    onLogo,
    resolveConflict,
  } = useCardDraft(id, userId, defaults);
  const [step, setStep] = useState(0),
    [side, setSide] = useState("recto"),
    [confirmed, setConfirmed] = useState(false),
    [sending, setSending] = useState(false),
    [showIssues, setShowIssues] = useState(false),
    [focusField, setFocusField] = useState(""),
    [logoProcessing, setLogoProcessing] = useState(false),
    [fontProcessing, setFontProcessing] = useState(false),
    [fontAnalysis, setFontAnalysis] = useState<any>(null);
  const stepPanel = useRef<HTMLElement>(null);
  const scrollAfterStep = useRef(false);
  useEffect(() => {
    if (scrollAfterStep.current)
      stepPanel.current?.scrollIntoView({ block: "start" });
    scrollAfterStep.current = false;
  }, [step]);
  const assetBusy = logoProcessing || fontProcessing;
  const issues = cardIssues(d, { logo: !!(localLogo || card?.logo_id) });
  const fieldError = (key: string) =>
    showIssues
      ? issues.find((issue) => issue.field === key)?.message
      : undefined;
  const highlight = (issue: any) => {
    setShowIssues(true);
    setStep(issue.step);
    setFocusField(issue.field);
  };
  const goStep = (next: number, fromFooter = false) => {
    if (assetBusy || next < 0 || next > 3) return;
    const missing =
      next > step ? issues.find((issue) => issue.step < next) : undefined;
    if (missing) {
      highlight(missing);
      return;
    }
    setFocusField("");
    scrollAfterStep.current = fromFooter;
    setStep(next);
  };
  useEffect(() => {
    setConfirmed(false);
  }, [d, localLogo]);
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(location.search);
    const requested = Number(params.get("step"));
    if (
      params.has("step") &&
      Number.isInteger(requested) &&
      requested >= 0 &&
      requested <= 3
    ) {
      const missing = cardIssues(d, {
        logo: !!(localLogo || card?.logo_id),
      }).find((issue) => issue.step < requested);
      setStep(missing?.step ?? requested);
      if (missing) {
        setShowIssues(true);
        setFocusField(missing.field);
      } else if (params.get("field")) {
        setShowIssues(true);
        setFocusField(params.get("field")!);
      }
    }
    // Initial navigation hint only: later typing must not move the user’s step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, id]);
  useEffect(() => {
    if (!ready || !focusField) return;
    const frame = requestAnimationFrame(() => {
      const target = Array.from(
        stepPanel.current?.querySelectorAll<HTMLElement>("[data-card-field]") ||
          [],
      ).find((el) => el.dataset.cardField === focusField);
      target?.focus();
      target?.scrollIntoView({ block: "center" });
      setFocusField("");
    });
    return () => cancelAnimationFrame(frame);
  }, [step, focusField, ready]);
  useEffect(() => {
    setConfirmed(false);
  }, [id]);
  const locked =
    card &&
    (card.identity_locked || ["live", "suspended"].includes(card.status));
  // Mêmes limites que le schéma du serveur : la saisie ne peut pas dépasser ce
  // que l'enregistrement accepte.
  const limits: Record<string, number> = {
    firstName: 100,
    lastName: 100,
    company: 150,
    title: 150,
    city: 150,
    desc: 2000,
    address: 500,
    whatsapp: 50,
  };
  const field = (key: string, label: string, type = "text") => (
    <label className="field" key={key}>
      {label}
      <input
        data-card-field={key}
        aria-label={label}
        type={type}
        value={d[key]}
        maxLength={limits[key] || 250}
        aria-invalid={!!fieldError(key)}
        aria-describedby={fieldError(key) ? "error-" + key : undefined}
        onChange={(e) => setD({ ...d, [key]: e.target.value })}
      />
      {fieldError(key) && (
        <small className="field-error" id={"error-" + key}>
          {fieldError(key)}
        </small>
      )}
    </label>
  );
  const save = async (go = false) => {
    if (go && (assetBusy || !confirmed)) return;
    if (go && issues.length) {
      highlight(issues[0]);
      return;
    }
    try {
      const c = await flush(true);
      setError("Brouillon enregistré.");
      if (go && c) router.push("/app/cards/" + c.id + "/checkout");
    } catch {}
  };
  if (!ready)
    return (
      <div className="editor-loading" role="status">
        <span className="loading-orbit" />
        <h2>
          {error
            ? "Le brouillon n’a pas pu être chargé."
            : "Ouverture de votre brouillon…"}
        </h2>
        {error && (
          <>
            <p>{error}</p>
            <button
              className="button primary"
              onClick={() => location.reload()}
            >
              Réessayer
            </button>
          </>
        )}
      </div>
    );
  return (
    <>
      <Heading
        eyebrow="LE GÉNÉRATEUR POPCARD"
        title={locked ? "Actualisez votre mini-site." : "Créons votre PopCard."}
      >
        Personnalisez votre carte et retrouvez votre brouillon à tout moment.
        {saveStatus && (
          <span className="save-status-pill" role="status" aria-live="polite">
            {saveStatus}
          </span>
        )}
      </Heading>
      <nav className="wizardbar" aria-label="Étapes de création">
        {["Modèle", "Identité visuelle", "Informations", "Aperçu"].map(
          (t, i) => (
            <button
              className={step === i ? "active" : ""}
              onClick={() => goStep(i)}
              aria-current={step === i ? "step" : undefined}
              aria-label={i + 1 + " " + t}
              disabled={assetBusy}
              key={t}
            >
              <b>{i + 1}</b>
              <span>{t}</span>
            </button>
          ),
        )}
      </nav>
      <div className={"editorgrid editor-creation step-" + step}>
        <section className="panel editor-form" ref={stepPanel} tabIndex={-1}>
          <div className="editor-fields">
            <span className="eyebrow">
              {/* taste-skill-ignore */}ÉTAPE 0{step + 1}
            </span>
            {showIssues && issues.some((issue) => issue.step === step) && (
              <div className="validation-summary" role="alert">
                <strong>Quelques informations restent à compléter.</strong>
                <ul>
                  {issues
                    .filter((issue) => issue.step === step)
                    .map((issue) => (
                      <li key={issue.field}>
                        <button type="button" onClick={() => highlight(issue)}>
                          {issue.message}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {step === 0 && (
              <>
                <h2>Choisissez votre modèle.</h2>
                <p>
                  Le recto présente votre identité. Le verso ouvre votre
                  mini-site.
                </p>
                <div className="templatechoices">
                  {[
                    ["A", "Essentiel", "Votre marque au premier plan"],
                    [
                      "B",
                      "Signature",
                      "Une composition graphique qui affirme votre identité",
                    ],
                    ["C", "Studio", "Une composition minimaliste"],
                  ].map(([v, t, s]) => (
                    <button
                      disabled={locked}
                      key={v}
                      onClick={() => setD({ ...d, tpl: v, designVersion: 2 })}
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
                  onLogo={onLogo}
                  onFontAnalysis={setFontAnalysis}
                  onProcessing={setLogoProcessing}
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
                <FontLibrary
                  data={d}
                  setData={setD}
                  disabled={locked}
                  onBusy={setFontProcessing}
                  analysis={fontAnalysis}
                />
              </>
            )}
            {step === 2 && (
              <>
                <h2>Faisons connaissance.</h2>
                <p>
                  Un nom ou une société et au moins un moyen de contact visible
                  sont obligatoires. Les autres informations sont facultatives.
                </p>
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
                <h3 tabIndex={-1} data-card-field="contact">
                  Vos coordonnées
                </h3>
                {fieldError("contact") && (
                  <p className="field-error">{fieldError("contact")}</p>
                )}
                {d.phones.map((p: any, i: number) => (
                  <div className="repeat-row" key={i}>
                    <input
                      aria-label="Libellé téléphone"
                      maxLength={60}
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
                      data-card-field={"phones." + i}
                      aria-invalid={!!fieldError("phones." + i)}
                      aria-describedby={
                        fieldError("phones." + i)
                          ? "phone-error-" + i
                          : undefined
                      }
                      type="tel"
                      maxLength={60}
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
                    {fieldError("phones." + i) && (
                      <small
                        className="field-error repeat-error"
                        id={"phone-error-" + i}
                      >
                        {fieldError("phones." + i)}
                      </small>
                    )}
                    <button
                      aria-label={"Supprimer le téléphone " + (i + 1)}
                      onClick={() =>
                        setD({
                          ...d,
                          phones: d.phones.filter(
                            (_: any, n: number) => n !== i,
                          ),
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
                      data-card-field={"emails." + i}
                      aria-invalid={!!fieldError("emails." + i)}
                      aria-describedby={
                        fieldError("emails." + i)
                          ? "email-error-" + i
                          : undefined
                      }
                      type="email"
                      maxLength={254}
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
                    {fieldError("emails." + i) && (
                      <small
                        className="field-error repeat-error"
                        id={"email-error-" + i}
                      >
                        {fieldError("emails." + i)}
                      </small>
                    )}
                    <button
                      aria-label={"Supprimer l’e-mail " + (i + 1)}
                      onClick={() =>
                        setD({
                          ...d,
                          emails: d.emails.filter(
                            (_: any, n: number) => n !== i,
                          ),
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
                        setD({
                          ...d,
                          show: { ...d.show, [k]: e.target.checked },
                        })
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
                <p>
                  Vérifiez les deux faces et le mini-site avant de commander.
                </p>
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
            <Message text={storageWarning} />
            <Message text={error} />
            {(saveStatus === "À synchroniser" ||
              saveStatus === "Conflit de modification") && (
              <div className="draft-retry">
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => save()}
                >
                  Réessayer l’enregistrement
                </button>
                {saveStatus === "Conflit de modification" && (
                  <div className="conflict-actions">
                    <p>
                      Une autre version a été enregistrée. Choisissez celle que
                      vous souhaitez conserver.
                    </p>
                    <button
                      className="button outline"
                      disabled={busy}
                      onClick={() => resolveConflict(false)}
                    >
                      Charger la version enregistrée
                    </button>
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => resolveConflict(true)}
                    >
                      Enregistrer ma version
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="wizardactions">
            <button
              className="button outline"
              disabled={step === 0 || assetBusy}
              onClick={() => goStep(step - 1, true)}
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
                disabled={assetBusy}
                onClick={() => goStep(step + 1, true)}
              >
                Continuer
              </button>
            ) : (
              <button
                className="button primary"
                disabled={busy || assetBusy || !confirmed}
                onClick={() => save(true)}
              >
                {locked ? "Recommander" : "Commander"} ↗
              </button>
            )}
          </div>
        </section>
        <aside
          className={"previewpanel" + (side === "site" ? " preview-site" : "")}
        >
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
              embedded
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
              disabled={busy || sending}
              onClick={async () => {
                setSending(true);
                try {
                  await flush(true);
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
                  setSending(false);
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
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [serverIssues, setServerIssues] = useState<any[]>([]),
    [ready, setReady] = useState(false),
    [pendingOrder, setPendingOrder] = useState<any>(null);
  const submitting = useRef(false);
  const storageKey = "popcard:checkout:" + user.id + ":" + id;
  const initial = {
    quantity: "1",
    country: "Maroc",
    billing_type: "person",
    billing_name: user.profile?.billing_name || user.name,
    ice: user.profile?.ice || "",
    address: user.profile?.address || "",
  };
  const [details, setDetails] = useState<any>(initial),
    [rights, setRights] = useState(false),
    [terms, setTerms] = useState(false);
  const q = Number(details.quantity),
    country = details.country;
  const issues = card ? cardIssues(card.data, { logo: !!card.logo_id }) : [];
  const blocking = serverIssues.length ? serverIssues : issues;
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setCard(undefined);
    setDetails(initial);
    setServerIssues([]);
    setPendingOrder(null);
    setError("");
    setRights(false);
    setTerms(false);
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (saved && typeof saved === "object")
        setDetails({
          ...initial,
          ...Object.fromEntries(
            Object.entries(saved).filter(
              ([key, value]) => key in initial && typeof value === "string",
            ),
          ),
        });
    } catch {}
    Promise.all([api("cards/" + id), api("orders")])
      .then(([nextCard, orders]) => {
        if (!cancelled) {
          setCard(nextCard);
          setPendingOrder(
            orders.find(
              (order: any) =>
                order.card_id === id &&
                ["awaiting_receipt", "review"].includes(order.status),
            ) || null,
          );
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
    // Restore only when opening this card’s checkout, never on each input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, storageKey]);
  const update = (key: string, value: string) => {
    const next = { ...details, [key]: value };
    setDetails(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };
  const submit = async (e: any) => {
    e.preventDefault();
    if (submitting.current || !card || blocking.length || pendingOrder) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      if (!Number.isInteger(q) || q < 1 || q > 500)
        throw Error("Choisissez une quantité entière entre 1 et 500.");
      if (!details.billing_name.trim())
        throw Error("Renseignez le nom de facturation.");
      if (details.address.trim().length < 5)
        throw Error("Renseignez une adresse complète de livraison.");
      if (details.billing_type === "company" && !/^\d{15}$/.test(details.ice))
        throw Error("ICE : 15 chiffres requis pour une entreprise.");
      const o = await api(
        "orders",
        {
          ...details,
          card_id: id,
          quantity: q,
          country,
          rights,
          terms,
        },
        { headers: { "X-Popcard-Version": card.draft_version } },
      );
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      router.push("/app/orders/" + o.id);
    } catch (e: any) {
      setError(e.message);
      if (e.issues) setServerIssues(e.issues);
      if (e.status === 409) {
        setRights(false);
        setTerms(false);
        try {
          setCard(await api("cards/" + id));
        } catch {}
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <Heading eyebrow="VOTRE COMMANDE" title="Prêt à faire bonne impression ?">
        Confirmez les informations de facturation et de livraison.
      </Heading>
      <Link
        className="button outline checkout-back"
        href={"/app/cards/" + id + "?step=3"}
      >
        ← Revenir à ma PopCard
      </Link>
      <Message text={error} />
      {!ready && <p role="status">Vérification de votre PopCard…</p>}
      {pendingOrder && (
        <div className="notice">
          <p>
            Une commande est déjà en cours pour cette PopCard. Retrouvez son
            montant et son suivi dans votre espace.
          </p>
          <Link
            className="button outline"
            href={"/app/orders/" + pendingOrder.id}
          >
            Consulter {pendingOrder.reference} →
          </Link>
        </div>
      )}
      {!!blocking.length && (
        <div className="validation-summary" role="alert">
          <strong>Complétez votre PopCard avant de commander.</strong>
          <ul>
            {blocking.map((issue: any) => (
              <li key={issue.field}>
                <Link
                  href={
                    "/app/cards/" +
                    id +
                    "?step=" +
                    issue.step +
                    "&field=" +
                    issue.field
                  }
                >
                  {issue.message} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!config?.ordersEnabled && (
        <Message text="Les commandes ouvriront après configuration des coordonnées bancaires par SALI. Vous pouvez continuer à préparer vos cartes." />
      )}
      {!user.verified_at && (
        <Message text="Confirmez votre adresse e-mail depuis Mon compte avant de commander." />
      )}
      <div className="editorgrid checkout-grid">
        <form className="panel checkout-form" onSubmit={submit}>
          <fieldset disabled={busy || !card || !!pendingOrder}>
            <legend>Quantité et livraison</legend>
            <div className="two-cols">
              <Field
                label="Quantité *"
                type="number"
                min={1}
                max={500}
                step={1}
                required
                value={details.quantity}
                onChange={(e: any) => update("quantity", e.target.value)}
              />
              <label className="field">
                Pays de livraison
                <select
                  value={country}
                  onChange={(e) => update("country", e.target.value)}
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
              <select
                value={details.billing_type}
                onChange={(e) => update("billing_type", e.target.value)}
              >
                <option value="person">Particulier</option>
                <option value="company">Entreprise</option>
              </select>
            </label>
            <Field
              label="Nom de facturation *"
              name="billing_name"
              required
              maxLength={200}
              value={details.billing_name}
              onChange={(e: any) => update("billing_name", e.target.value)}
            />
            <Field
              label={
                details.billing_type === "company"
                  ? "ICE · 15 chiffres *"
                  : "ICE · facultatif pour un particulier"
              }
              name="ice"
              required={details.billing_type === "company"}
              pattern={
                details.billing_type === "company" ? "[0-9]{15}" : undefined
              }
              maxLength={15}
              inputMode="numeric"
              value={details.ice}
              onChange={(e: any) => update("ice", e.target.value)}
            />
            <Field
              label="Adresse complète de livraison *"
              name="address"
              required
              minLength={5}
              maxLength={500}
              value={details.address}
              onChange={(e: any) => update("address", e.target.value)}
            />
            <label className="check">
              <input
                name="rights"
                type="checkbox"
                required
                checked={rights}
                onChange={(e) => setRights(e.target.checked)}
              />
              Je dispose des droits sur les logos, textes et images fournis.
            </label>
            <label className="check">
              <input
                name="terms"
                type="checkbox"
                required
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              J’ai vérifié les informations et j’accepte les{" "}
              <Link href="/conditions">conditions</Link>.
            </label>
            <button
              className="button primary"
              disabled={
                busy ||
                !ready ||
                !card ||
                !!pendingOrder ||
                !!blocking.length ||
                !config?.ordersEnabled ||
                !user.verified_at
              }
            >
              {busy
                ? "Enregistrement de la commande…"
                : "Enregistrer et passer au virement ↗"}
            </button>
          </fieldset>
        </form>
        <aside className="panel checkout-summary">
          {card && <CardPreview data={card.data} logo={logo(card)} />}
          <h2>Récapitulatif</h2>
          <p>
            {details.quantity || "—"} carte{q > 1 ? "s" : ""}
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
            {Number.isInteger(q) && q >= 1 && q <= 500
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
            Virement bancaire. SALI vérifie sa réception avant la production.
            Votre mini-site devient public à l’expédition.
          </p>
          <Link className="textlink" href={"/app/cards/" + id + "?step=3"}>
            Modifier ma PopCard →
          </Link>
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
            "Choisissez un modèle et personnalisez votre identité et vos coordonnées. Vos saisies sont enregistrées automatiquement et votre brouillon peut être repris à tout moment.",
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
            "SALI vérifie la réception du virement et vos informations avant de lancer la production. Le mini-site devient public à l’expédition ; le suivi apparaît dans votre commande.",
          ],
          [
            "5. Modifier après publication",
            "Les coordonnées du mini-site restent modifiables. Le logo, les couleurs et le modèle imprimés sont verrouillés.",
          ],
          [
            "Le logo et ses couleurs",
            "Importez votre logo en PNG, JPEG, SVG ou PDF. Une palette applique ensemble la couleur principale, le fond et l’accent. Un fond transparent offre le meilleur rendu blanc pour Essentiel. Un SVG au lettrage converti en tracés préserve son apparence.",
          ],
          [
            "Choisir mes polices",
            "Recherchez parmi 80 familles, filtrez les styles et comparez les aperçus. Vous pouvez importer une police TTF, OTF, WOFF ou WOFF2 de 2 Mo maximum. Le nom de police d’un logo est lu lorsque le fichier le contient ; sinon, le choix est confirmé visuellement.",
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
    // Les lignes restent associées à l'onglet qui les a chargées : au
    // changement d'onglet, on n'affiche jamais des commandes comme des cartes.
    [data, setData] = useState<{ tab: string; rows: any[] }>({
      tab: "",
      rows: [],
    }),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<any>();
  const rows = data.tab === tab ? data.rows : [];
  const load = () => {
    const current = tab;
    return api("admin/" + current)
      .then((r) => setData({ tab: current, rows: r }))
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    setSelected(undefined);
    setError("");
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
              <p>
                {c.status === "live"
                  ? "Publiée"
                  : c.status === "suspended"
                    ? "Suspendue"
                    : "Brouillon"}
              </p>
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
          <Message text="Journal réservé aux administrateurs. En mode log, les e-mails ne partent pas et les liens de test se trouvent ici. En mode SMTP, les liens sont masqués une fois l’e-mail envoyé." />
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
