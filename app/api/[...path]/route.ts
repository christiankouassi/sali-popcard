import { NextRequest, NextResponse } from "next/server";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, transaction } from "@/lib/db";
import { currentUser, session, logout, token, hash } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { price, transitions, canPublish, labels } from "@/lib/business.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
class Fault extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z
  .string()
  .min(10)
  .max(128)
  .regex(/[A-Za-z]/)
  .regex(/[0-9]/);
const cardSchema = z.object({
  tpl: z.enum(["A", "B", "C"]),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#FFFFFF"),
  firstName: z.string().max(100),
  lastName: z.string().max(100),
  company: z.string().max(150),
  title: z.string().max(150),
  city: z.string().max(150),
  desc: z.string().max(2000),
  address: z.string().max(500),
  website: z.string().max(250),
  whatsapp: z.string().max(50),
  instagram: z.string().max(250),
  linkedin: z.string().max(250),
  facebook: z.string().max(250),
  lang: z.enum(["fr", "en"]),
  fontTitle: z.enum([
    "Montserrat",
    "Open Sans",
    "Cormorant Garamond",
    "Poppins",
  ]),
  fontBody: z.enum([
    "Montserrat",
    "Open Sans",
    "Cormorant Garamond",
    "Poppins",
  ]),
  phones: z.array(z.tuple([z.string().max(60), z.string().max(60)])).max(5),
  emails: z.array(z.union([z.literal(""), emailSchema])).max(5),
  show: z.record(z.string(), z.boolean()),
  logoTile: z.boolean(),
});
const origin = () => {
  const configured = process.env.APP_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV === "production")
    throw new Fault(503, "APP_URL doit être configurée.");
  return "http://localhost:3000";
};
// Protection CSRF : la requête doit venir de l'URL configurée ou du domaine
// réellement servi (domaine personnalisé, aperçu Netlify). Le navigateur fixe
// Origin et Host : une page tierce ne peut pas les falsifier.
const sameOrigin = (req: NextRequest) => {
  const o = req.headers.get("origin");
  if (!o) return false;
  if (o === origin()) return true;
  const host = req.headers.get("host");
  const proto = (
    req.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http")
  )
    .split(",")[0]
    .trim();
  return !!host && o === `${proto}://${host}`;
};
// IP du visiteur : Netlify fournit un en-tête que le client ne peut pas
// fixer. X-Forwarded-For sert de repli sur un autre hébergeur.
const clientIp = (req: NextRequest) =>
  req.headers.get("x-nf-client-connection-ip") ||
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  "inconnue";
const uuid = (v: string | undefined) => {
  if (!z.string().uuid().safeParse(v).success)
    throw new Fault(404, "Élément introuvable.");
  return v as string;
};
async function rate(key: string, max: number) {
  const r = await query(
    "INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.count+1 END, expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+interval '15 minutes' ELSE rate_limits.expires_at END RETURNING count",
    [key],
  );
  // Entretien occasionnel : compteurs, jetons et aperçus expirés.
  if (Math.random() < 0.02)
    await Promise.all([
      query("DELETE FROM rate_limits WHERE expires_at<now()"),
      query("DELETE FROM tokens WHERE expires_at<now()"),
      query("DELETE FROM preview_links WHERE expires_at<now()"),
      query("DELETE FROM sessions WHERE expires_at<now()"),
    ]);
  if (r.rows[0].count > max)
    throw new Fault(429, "Trop de tentatives. Réessayez dans 15 minutes.");
}
const fieldNames: Record<string, string> = {
  name: "nom",
  email: "e-mail",
  password: "mot de passe",
  confirmation: "confirmation du mot de passe",
  current_password: "mot de passe actuel",
  terms: "acceptation des conditions",
  rights: "droits d’utilisation",
  token: "lien",
  firstName: "prénom",
  lastName: "nom",
  company: "société",
  title: "fonction",
  city: "ville",
  desc: "description",
  address: "adresse",
  website: "site web",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  phones: "téléphones",
  emails: "e-mails de la carte",
  quantity: "quantité",
  billing_type: "type de facturation",
  billing_name: "nom de facturation",
  ice: "ICE",
  country: "pays",
  card_id: "PopCard",
  status: "statut",
  note: "note",
  tracking: "numéro de suivi",
};
function zodMessage(e: z.ZodError) {
  const keys = [
    ...new Set(e.issues.map((i) => String(i.path[0] ?? "formulaire"))),
  ];
  const labels = keys.map((k) => fieldNames[k] || k);
  const hint = keys.includes("password")
    ? " Le mot de passe doit contenir 10 caractères minimum, avec lettres et chiffres."
    : "";
  return "Vérifiez : " + labels.join(", ") + "." + hint;
}
const publicUser = (u: any) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  is_admin: u.is_admin,
  verified_at: u.verified_at,
  profile: u.profile,
});
async function owned(table: "cards" | "orders", id: string, u: any) {
  if (!z.string().uuid().safeParse(id).success)
    throw new Fault(404, "Élément introuvable.");
  const r = await query(
    `SELECT *, ${table === "cards" ? "EXISTS(SELECT 1 FROM orders WHERE card_id=cards.id) AS identity_locked" : "false AS identity_locked"} FROM ${table} WHERE id=$1 AND user_id=$2`,
    [id, u.id],
  );
  if (!r.rows[0]) throw new Fault(404, "Élément introuvable.");
  return r.rows[0];
}
async function verification(u: any) {
  const t = await token(u.id, "verify");
  return await sendMail(
    u.id,
    u.email,
    "Vérifiez votre adresse PopCard",
    `${origin()}/verification?token=${t}`,
  );
}
async function upload(
  req: NextRequest,
  u: any,
  imageOnly = false,
  supplied?: FormDataEntryValue | null,
) {
  const f =
    supplied === undefined ? (await req.formData()).get("file") : supplied;
  if (!(f instanceof File) || f.size < 1 || f.size > 3 * 1024 * 1024)
    throw new Fault(422, "Fichier requis, 3 Mo maximum.");
  const b = Buffer.from(await f.arrayBuffer());
  let mime = "";
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    mime = "image/png";
  else if (b[0] === 255 && b[1] === 216 && b[2] === 255) mime = "image/jpeg";
  else if (
    b.subarray(0, 4).toString() === "RIFF" &&
    b.subarray(8, 12).toString() === "WEBP"
  )
    mime = "image/webp";
  else if (!imageOnly && b.subarray(0, 5).toString() === "%PDF-")
    mime = "application/pdf";
  if (!mime)
    throw new Fault(
      422,
      "Format autorisé : PNG, JPG, WebP" + (imageOnly ? "" : ", PDF"),
    );
  const id = randomUUID();
  await query(
    "INSERT INTO files(id,user_id,name,mime,bytes) VALUES($1,$2,$3,$4,$5)",
    [id, u.id, f.name.slice(0, 200), mime, b],
  );
  return id;
}
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await params).path;
    const p = path.join("/");
    const post = req.method === "POST";
    if (post && !sameOrigin(req))
      throw new Fault(403, "Origine de requête non autorisée.");
    if (
      post &&
      Number(req.headers.get("content-length") || 0) >
        (path[0] === "cards" && path[2] === "logo" ? 7 : 4) * 1024 * 1024
    )
      throw new Fault(413, "Fichier trop volumineux.");
    const json = async () => {
      try {
        return await req.json();
      } catch {
        throw new Fault(400, "Requête invalide.");
      }
    };
    const u = await currentUser();
    if (p === "config" && !post)
      return NextResponse.json({
        ordersEnabled:
          process.env.POPCARD_ORDERS_ENABLED === "true" &&
          !!process.env.POPCARD_BANK_RIB &&
          !!process.env.POPCARD_BANK_HOLDER,
        bank: {
          name: process.env.POPCARD_BANK_NAME,
          holder: process.env.POPCARD_BANK_HOLDER,
          rib: process.env.POPCARD_BANK_RIB,
          iban: process.env.POPCARD_BANK_IBAN,
          swift: process.env.POPCARD_BANK_SWIFT,
        },
        delay: process.env.POPCARD_REVIEW_DELAY || "1 à 3 jours ouvrés",
        shippingMA: Number(process.env.POPCARD_SHIPPING_MA || 0),
        shippingINT: Number(process.env.POPCARD_SHIPPING_INT || 0),
        invoicesEnabled:
          process.env.POPCARD_INVOICE_ENABLED === "true" &&
          !!process.env.POPCARD_COMPANY_ICE &&
          !!process.env.POPCARD_COMPANY_ADDRESS,
        companyAddress: process.env.POPCARD_COMPANY_ADDRESS,
        companyICE: process.env.POPCARD_COMPANY_ICE,
        mailMode: process.env.MAIL_MODE || "log",
      });
    if (p === "auth/register" && post) {
      const v = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: emailSchema,
          password: passwordSchema,
          confirmation: z.string(),
          terms: z.literal(true),
        })
        .parse(await json());
      if (v.password !== v.confirmation)
        throw new Fault(422, "Les mots de passe diffèrent.");
      await rate("register:" + v.email, 5);
      await rate("register-ip:" + clientIp(req), 15);
      const id = randomUUID();
      await query(
        "INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,$3,$4)",
        [id, v.email, v.name, await bcrypt.hash(v.password, 12)],
      );
      await session(id);
      await verification({ id, email: v.email });
      return NextResponse.json({ ok: true });
    }
    if (p === "auth/login" && post) {
      const v = z
        .object({ email: emailSchema, password: z.string().max(128) })
        .parse(await json());
      await rate("login:" + v.email, 12);
      await rate("login-ip:" + clientIp(req), 50);
      const r = await query("SELECT * FROM users WHERE email=$1", [v.email]);
      const user = r.rows[0];
      const valid = await bcrypt.compare(
        v.password,
        user?.password_hash ||
          "$2b$12$r6MO/XsLte83Ag35bDpJHeeExBZltBgtSFEMHmBumAY.EALBK0pWe",
      );
      if (!user || !valid)
        throw new Fault(401, "E-mail ou mot de passe incorrect.");
      await session(user.id);
      return NextResponse.json({ ok: true });
    }
    if (p === "auth/logout" && post) {
      await logout();
      return NextResponse.json({ ok: true });
    }
    if (p === "auth/forgot" && post) {
      const v = z.object({ email: emailSchema }).parse(await json());
      await rate("forgot:" + v.email, 4);
      await rate("forgot-ip:" + clientIp(req), 20);
      const r = await query("SELECT * FROM users WHERE email=$1", [v.email]);
      if (r.rows[0]) {
        const user = r.rows[0];
        const t = await token(user.id, "reset");
        await sendMail(
          user.id,
          user.email,
          "Réinitialiser votre mot de passe",
          `${origin()}/reinitialisation?token=${t}`,
        );
      }
      return NextResponse.json({
        ok: true,
        message:
          "Si ce compte existe, un lien de réinitialisation a été préparé.",
      });
    }
    if (p === "auth/reset" && post) {
      const v = z
        .object({
          token: z.string().length(64),
          password: passwordSchema,
          confirmation: z.string(),
        })
        .parse(await json());
      if (v.password !== v.confirmation)
        throw new Fault(422, "Les mots de passe diffèrent.");
      const h = await bcrypt.hash(v.password, 12);
      await transaction(async (c) => {
        const r = await c.query(
          "DELETE FROM tokens WHERE token_hash=$1 AND kind='reset' AND expires_at>now() RETURNING user_id",
          [hash(v.token)],
        );
        if (!r.rows[0]) throw new Fault(422, "Lien expiré ou déjà utilisé.");
        await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
          h,
          r.rows[0].user_id,
        ]);
        await c.query("DELETE FROM sessions WHERE user_id=$1", [
          r.rows[0].user_id,
        ]);
      });
      await logout();
      return NextResponse.json({ ok: true });
    }
    if (p === "auth/verify" && post) {
      const v = z.object({ token: z.string().length(64) }).parse(await json());
      await transaction(async (c) => {
        const r = await c.query(
          "DELETE FROM tokens WHERE token_hash=$1 AND kind='verify' AND expires_at>now() RETURNING user_id",
          [hash(v.token)],
        );
        if (!r.rows[0]) throw new Fault(422, "Lien expiré ou déjà utilisé.");
        await c.query("UPDATE users SET verified_at=now() WHERE id=$1", [
          r.rows[0].user_id,
        ]);
      });
      return NextResponse.json({ ok: true });
    }
    if (path[0] === "public" && !post) {
      const r = await query(
        "SELECT id,slug,data,logo_id FROM cards WHERE slug=$1 AND status='live'",
        [path[1]],
      );
      if (!r.rows[0])
        throw new Fault(404, "Cette PopCard n’est pas disponible.");
      return NextResponse.json(r.rows[0]);
    }
    if (path[0] === "preview" && !post) {
      if (!/^[a-f0-9]{64}$/.test(path[1] || ""))
        throw new Fault(404, "Aperçu introuvable ou expiré.");
      const r = await query(
        "SELECT c.data,c.logo_id,c.slug FROM preview_links p JOIN cards c ON c.id=p.card_id WHERE p.token_hash=$1 AND p.expires_at>now()",
        [hash(path[1])],
      );
      if (!r.rows[0]) throw new Fault(404, "Aperçu introuvable ou expiré.");
      const card = r.rows[0];
      if (card.logo_id) {
        const f = await query("SELECT mime,bytes FROM files WHERE id=$1", [
          card.logo_id,
        ]);
        if (f.rows[0])
          card.logo =
            "data:" +
            f.rows[0].mime +
            ";base64," +
            Buffer.from(f.rows[0].bytes).toString("base64");
      }
      return NextResponse.json(card);
    }
    if (path[0] === "files" && !post) {
      if (!z.string().uuid().safeParse(path[1]).success)
        throw new Fault(404, "Fichier introuvable.");
      const r = await query(
        "SELECT f.* FROM files f WHERE f.id=$1 AND (f.user_id=$2 OR $3 OR EXISTS(SELECT 1 FROM cards c WHERE c.logo_id=f.id AND c.status='live'))",
        [path[1], u?.id ?? null, !!u?.is_admin],
      );
      const f = r.rows[0];
      if (!f) throw new Fault(404, "Fichier introuvable.");
      return new NextResponse(new Uint8Array(f.bytes), {
        headers: {
          "Content-Type": f.mime,
          "Content-Disposition": `${f.mime === "application/pdf" ? "attachment" : "inline"}; filename="document"`,
          "Cache-Control": "private, no-store",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      });
    }
    if (!u) throw new Fault(401, "Connectez-vous pour continuer.");
    if (p === "me" && !post) return NextResponse.json(publicUser(u));
    if (p === "auth/resend" && post) {
      await rate("resend:" + u.id, 4);
      const status = !u.verified_at ? await verification(u) : "verified";
      return NextResponse.json({ ok: true, status });
    }
    if (p === "profile" && post) {
      const v = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: emailSchema,
          billing_name: z.string().max(200),
          ice: z.union([z.literal(""), z.string().regex(/^\d{15}$/)]),
          address: z.string().max(500),
          current_password: z.string().optional(),
        })
        .parse(await json());
      const changed = v.email !== u.email;
      if (changed) {
        await rate("profile-email:" + u.id, 10);
        const row = await query("SELECT password_hash FROM users WHERE id=$1", [
          u.id,
        ]);
        if (
          !v.current_password ||
          !(await bcrypt.compare(v.current_password, row.rows[0].password_hash))
        )
          throw new Fault(422, "Votre mot de passe actuel est requis.");
      }
      await query(
        "UPDATE users SET name=$1,email=$2,profile=$3,verified_at=CASE WHEN $4 THEN NULL ELSE verified_at END WHERE id=$5",
        [
          v.name,
          v.email,
          { billing_name: v.billing_name, ice: v.ice, address: v.address },
          changed,
          u.id,
        ],
      );
      if (changed) await verification({ ...u, email: v.email });
      return NextResponse.json({ ok: true });
    }
    if (p === "password" && post) {
      const v = z
        .object({
          current_password: z.string(),
          password: passwordSchema,
          confirmation: z.string(),
        })
        .parse(await json());
      if (v.password !== v.confirmation)
        throw new Fault(422, "Les mots de passe diffèrent.");
      await rate("password:" + u.id, 10);
      const r = await query("SELECT password_hash FROM users WHERE id=$1", [
        u.id,
      ]);
      if (!(await bcrypt.compare(v.current_password, r.rows[0].password_hash)))
        throw new Fault(422, "Mot de passe actuel incorrect.");
      await transaction(async (c) => {
        await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
          await bcrypt.hash(v.password, 12),
          u.id,
        ]);
        await c.query("DELETE FROM sessions WHERE user_id=$1", [u.id]);
      });
      await session(u.id);
      return NextResponse.json({ ok: true });
    }
    if (p === "cards" && !post)
      return NextResponse.json(
        (
          await query(
            "SELECT *,EXISTS(SELECT 1 FROM orders WHERE card_id=cards.id) AS identity_locked FROM cards WHERE user_id=$1 ORDER BY created_at DESC",
            [u.id],
          )
        ).rows,
      );
    if (p === "cards" && post) {
      const v = cardSchema.parse(await json());
      await rate("card-create:" + u.id, 30);
      const id = randomUUID();
      const r = await query(
        "INSERT INTO cards(id,user_id,slug,data) VALUES($1,$2,$3,$4) RETURNING *",
        [id, u.id, randomUUID().replaceAll("-", "").slice(0, 16), v],
      );
      return NextResponse.json(r.rows[0]);
    }
    if (path[0] === "cards" && path.length === 2) {
      const card = await owned("cards", path[1], u);
      if (!post) return NextResponse.json(card);
      const v = cardSchema.parse(await json());
      const saved = await transaction(async (c) => {
        const locked = (
          await c.query(
            "SELECT * FROM cards WHERE id=$1 AND user_id=$2 FOR UPDATE",
            [card.id, u.id],
          )
        ).rows[0];
        const ordered = (
          await c.query("SELECT 1 FROM orders WHERE card_id=$1 LIMIT 1", [
            card.id,
          ])
        ).rowCount;
        if (ordered || ["live", "suspended"].includes(locked.status)) {
          for (const key of [
            "tpl",
            "primary",
            "accent",
            "background",
            "fontTitle",
            "fontBody",
            "logoTile",
          ] as const)
            (v as any)[key] = locked.data[key];
        }
        await c.query("UPDATE cards SET data=$1,updated_at=now() WHERE id=$2", [
          v,
          card.id,
        ]);
        return { ...locked, data: v, identity_locked: !!ordered };
      });
      return NextResponse.json(saved);
    }
    if (path[0] === "cards" && path[2] === "share-preview" && post) {
      const card = await owned("cards", path[1], u);
      await rate("preview:" + u.id, 10);
      const secret = randomBytes(32).toString("hex");
      await query(
        "DELETE FROM preview_links WHERE card_id=$1 OR expires_at<now()",
        [card.id],
      );
      await query(
        "INSERT INTO preview_links(token_hash,card_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
        [hash(secret), card.id],
      );
      const url = origin() + "/apercu?token=" + secret;
      const status = await sendMail(
        u.id,
        u.email,
        "Votre aperçu PopCard",
        "Votre aperçu privé (valable 7 jours) :\n" +
          url +
          "\nCe lien ne publie pas votre mini-site. Toute personne disposant du lien peut consulter l’aperçu.",
      );
      return NextResponse.json({ url, status });
    }
    if (path[0] === "cards" && path[2] === "logo" && post) {
      const card = await owned("cards", path[1], u);
      if (card.identity_locked)
        throw new Fault(422, "Le logo commandé est verrouillé.");
      await rate("logo:" + u.id, 30);
      const form = await req.formData();
      const id = await upload(req, u, true, form.get("file"));
      let originalId = id;
      try {
        if (form.get("original"))
          originalId = await upload(req, u, true, form.get("original"));
        await transaction(async (c) => {
          const locked = (
            await c.query(
              "SELECT * FROM cards WHERE id=$1 AND user_id=$2 FOR UPDATE",
              [card.id, u.id],
            )
          ).rows[0];
          const ordered = (
            await c.query("SELECT 1 FROM orders WHERE card_id=$1 LIMIT 1", [
              card.id,
            ])
          ).rowCount;
          if (ordered || ["live", "suspended"].includes(locked.status))
            throw new Fault(422, "Le logo commandé est verrouillé.");
          await c.query(
            "UPDATE cards SET logo_id=$1,original_logo_id=$3,updated_at=now() WHERE id=$2",
            [id, card.id, originalId],
          );
          // L'ancien logo n'est plus utilisé nulle part : il est supprimé pour
          // ne pas remplir la base à chaque nouvel import.
          const stale = [locked.logo_id, locked.original_logo_id].filter(
            (x) => x && x !== id && x !== originalId,
          );
          if (stale.length)
            await c.query(
              "DELETE FROM files f WHERE f.id = ANY($1::uuid[]) AND NOT EXISTS(SELECT 1 FROM cards WHERE logo_id=f.id OR original_logo_id=f.id) AND NOT EXISTS(SELECT 1 FROM orders WHERE receipt_id=f.id OR snapshot->>'logo_id'=f.id::text)",
              [stale],
            );
        });
      } catch (e) {
        await query("DELETE FROM files WHERE id=$1 OR id=$2", [id, originalId]);
        throw e;
      }
      return NextResponse.json({ logo_id: id, original_logo_id: originalId });
    }

    if (p === "orders" && !post)
      return NextResponse.json(
        (
          await query(
            "SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC",
            [u.id],
          )
        ).rows,
      );
    if (p === "orders" && post) {
      if (!u.verified_at)
        throw new Fault(403, "Vérifiez votre e-mail avant de commander.");
      if (
        process.env.POPCARD_ORDERS_ENABLED !== "true" ||
        !process.env.POPCARD_BANK_RIB ||
        !process.env.POPCARD_BANK_HOLDER
      )
        throw new Fault(503, "Les commandes ne sont pas encore ouvertes.");
      await rate("order:" + u.id, 20);
      const v = z
        .object({
          card_id: z.string().uuid(),
          quantity: z.number().int().min(1).max(500),
          billing_type: z.enum(["person", "company"]),
          billing_name: z.string().trim().min(2).max(200),
          ice: z.string().max(15),
          country: z.enum([
            "Maroc",
            "France",
            "Belgique",
            "Côte d’Ivoire",
            "Sénégal",
          ]),
          address: z.string().trim().min(5).max(500),
          rights: z.literal(true),
          terms: z.literal(true),
        })
        .parse(await json());
      if (v.billing_type === "company" && !/^\d{15}$/.test(v.ice))
        throw new Fault(422, "ICE : 15 chiffres requis.");
      const order = await transaction(async (c) => {
        const r = await c.query(
          "SELECT * FROM cards WHERE id=$1 AND user_id=$2 FOR UPDATE",
          [v.card_id, u.id],
        );
        const card = r.rows[0];
        if (!card) throw new Fault(404, "PopCard introuvable.");
        if (
          ![card.data.firstName, card.data.lastName, card.data.company].some(
            (x) => x?.trim(),
          )
        )
          throw new Fault(422, "Renseignez votre nom ou votre société.");
        const pending = await c.query(
          "SELECT * FROM orders WHERE card_id=$1 AND status IN ('awaiting_receipt','review')",
          [card.id],
        );
        if (pending.rows[0]) return pending.rows[0];
        const shipping = Number(
          v.country === "Maroc"
            ? process.env.POPCARD_SHIPPING_MA || 0
            : process.env.POPCARD_SHIPPING_INT || 0,
        );
        const reorder = ["live", "suspended"].includes(card.status);
        const id = randomUUID();
        const o = await c.query(
          "INSERT INTO orders(id,user_id,card_id,reference,quantity,amount,shipping,reorder,snapshot,billing,delivery,rights_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now()) RETURNING *",
          [
            id,
            u.id,
            card.id,
            "PC-" +
              new Date().getFullYear() +
              "-" +
              id.slice(0, 8).toUpperCase(),
            v.quantity,
            price(v.quantity, reorder, shipping),
            shipping,
            reorder,
            { ...card.data, logo_id: card.logo_id },
            { type: v.billing_type, name: v.billing_name, ice: v.ice },
            { country: v.country, address: v.address },
          ],
        );
        await c.query(
          "INSERT INTO order_events(order_id,actor_id,status,message) VALUES($1,$2,$3,$4)",
          [
            id,
            u.id,
            "awaiting_receipt",
            "Commande enregistrée. Virement attendu.",
          ],
        );
        return o.rows[0];
      });
      await sendMail(
        u.id,
        u.email,
        "Votre commande " + order.reference,
        "Votre commande est enregistrée. Déposez votre justificatif depuis votre espace PopCard.",
      );
      return NextResponse.json(order);
    }
    if (path[0] === "orders" && path.length === 2 && !post) {
      const o = await owned("orders", path[1], u);
      return NextResponse.json({
        ...o,
        events: (
          await query(
            "SELECT * FROM order_events WHERE order_id=$1 ORDER BY created_at",
            [o.id],
          )
        ).rows,
      });
    }
    if (path[0] === "orders" && path[2] === "receipt" && post) {
      const o = await owned("orders", path[1], u);
      if (!["awaiting_receipt", "review", "rejected"].includes(o.status))
        throw new Fault(422, "Le paiement a déjà été traité.");
      await rate("receipt:" + u.id, 10);
      const id = await upload(req, u);
      await transaction(async (c) => {
        const r = await c.query(
          "UPDATE orders SET receipt_id=$1,status='review',note=NULL WHERE id=$2 AND status IN ('awaiting_receipt','review','rejected') RETURNING id",
          [id, o.id],
        );
        if (!r.rowCount)
          throw new Fault(409, "La commande vient d’être traitée.");
        await c.query(
          "INSERT INTO order_events(order_id,actor_id,status,message) VALUES($1,$2,$3,$4)",
          [
            o.id,
            u.id,
            "review",
            "Justificatif reçu. Paiement en cours de vérification.",
          ],
        );
      });
      return NextResponse.json({ ok: true });
    }
    if (path[0] === "admin") {
      if (!u.is_admin) throw new Fault(403, "Accès administrateur requis.");
      if (p === "admin/orders" && !post)
        return NextResponse.json(
          (
            await query(
              "SELECT o.*,u.name AS customer_name,u.email AS customer_email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY created_at DESC",
            )
          ).rows,
        );
      if (p === "admin/mail" && !post)
        return NextResponse.json(
          (
            await query(
              "SELECT id,recipient,subject,body,status,created_at FROM mail_outbox ORDER BY created_at DESC LIMIT 100",
            )
          ).rows,
        );
      if (p === "admin/users" && !post)
        return NextResponse.json(
          (
            await query(
              "SELECT id,email,name,is_admin,verified_at,created_at FROM users ORDER BY created_at DESC",
            )
          ).rows,
        );
      if (p === "admin/cards" && !post)
        return NextResponse.json(
          (await query("SELECT * FROM cards ORDER BY created_at DESC")).rows,
        );
      if (path[1] === "cards" && post) {
        const v = z
          .object({ status: z.enum(["live", "suspended"]) })
          .parse(await json());
        const r = await query(
          "UPDATE cards SET status=$1 WHERE id=$2 AND status IN ('live','suspended') RETURNING id",
          [v.status, uuid(path[2])],
        );
        if (!r.rowCount) throw new Fault(422, "Cette carte n’est pas publiée.");
        return NextResponse.json({ ok: true });
      }
      if (path[1] === "orders" && path.length === 3 && !post) {
        const r = await query(
          "SELECT o.*,c.slug FROM orders o JOIN cards c ON c.id=o.card_id WHERE o.id=$1 AND o.paid_at IS NOT NULL",
          [uuid(path[2])],
        );
        if (!r.rows[0]) throw new Fault(404, "Commande payée introuvable.");
        return NextResponse.json(r.rows[0]);
      }
      if (path[1] === "orders" && post) {
        const v = z
          .object({
            status: z.enum([
              "verified",
              "rejected",
              "production",
              "shipped",
              "delivered",
            ]),
            note: z.string().max(2000),
            tracking: z.string().max(150),
            bank_confirmed: z.boolean(),
            rights_confirmed: z.boolean(),
          })
          .parse(await json());
        const o = await transaction(async (c) => {
          const r = await c.query(
            "SELECT * FROM orders WHERE id=$1 FOR UPDATE",
            [uuid(path[2])],
          );
          const o = r.rows[0];
          if (!o) throw new Fault(404, "Commande introuvable.");
          if (!(transitions as any)[o.status]?.includes(v.status))
            throw new Fault(422, "Transition impossible.");
          if (
            v.status === "verified" &&
            (!o.receipt_id || !v.bank_confirmed || !v.rights_confirmed)
          )
            throw new Fault(
              422,
              "Confirmez le versement et les droits avant validation.",
            );
          if (v.status === "shipped" && !v.tracking.trim())
            throw new Fault(422, "Numéro de suivi requis.");
          await c.query(
            "UPDATE orders SET status=$1,note=$2,tracking=COALESCE(NULLIF($3,''),tracking),paid_at=CASE WHEN $1='verified' THEN now() ELSE paid_at END WHERE id=$4",
            [v.status, v.note, v.tracking, o.id],
          );
          if (canPublish(v.status))
            await c.query(
              "UPDATE cards SET status='live' WHERE id=$1 AND status='draft'",
              [o.card_id],
            );
          await c.query(
            "INSERT INTO order_events(order_id,actor_id,status,message) VALUES($1,$2,$3,$4)",
            [o.id, u.id, v.status, v.note || (labels as any)[v.status]],
          );
          return o;
        });
        const customer = (
          await query("SELECT email FROM users WHERE id=$1", [o.user_id])
        ).rows[0];
        await sendMail(
          o.user_id,
          customer.email,
          "Suivi " + o.reference,
          (labels as any)[v.status] + (v.note ? " : " + v.note : ""),
        );
        return NextResponse.json({ ok: true });
      }
    }
    throw new Fault(404, "Action introuvable.");
  } catch (e) {
    if (e instanceof Fault)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: zodMessage(e) }, { status: 422 });
    if (
      (e as any).code === "23505" ||
      /duplicate key value/.test((e as any)?.message || "")
    )
      return NextResponse.json(
        { error: "Cet e-mail ou cette commande existe déjà." },
        { status: 409 },
      );
    // Le détail technique reste dans les journaux du serveur.
    console.error("API PopCard", e instanceof Error ? e.message : "Erreur");
    return NextResponse.json(
      {
        error:
          "Le service est momentanément indisponible. Réessayez dans un instant.",
      },
      { status: 503 },
    );
  }
}
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const r = await handler(req, ctx);
  r.headers.set("Cache-Control", "private, no-store");
  return r;
}
export const POST = GET;
