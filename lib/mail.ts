import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";
import { query } from "./db";
// Les liens de vérification, de réinitialisation et d'aperçu donnent accès à un
// compte ou à une carte. Une fois l'e-mail réellement envoyé, le journal n'en
// garde qu'une version masquée : ni un administrateur ni une fuite de la base
// ne peuvent réutiliser un lien encore valide.
const redact = (body: string) =>
  body.replace(/([?&]token=)[A-Za-z0-9]+/g, "$1[masqué après envoi]");
export async function sendMail(
  userId: string,
  email: string,
  subject: string,
  body: string,
) {
  const id = randomUUID();
  await query(
    "INSERT INTO mail_outbox(id,user_id,recipient,subject,body) VALUES($1,$2,$3,$4,$5)",
    [id, userId, email, subject, body],
  );
  if (process.env.MAIL_MODE !== "smtp") {
    if (process.env.NODE_ENV !== "production")
      console.log("[Email local]", subject, body);
    await query("UPDATE mail_outbox SET status='log' WHERE id=$1", [id]);
    return "log";
  }
  try {
    const smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === "465",
      // STARTTLS obligatoire et certificat vérifié : les identifiants SMTP ne
      // circulent jamais en clair ni vers un serveur usurpé. Seul le serveur
      // SMTP local des tests automatisés désactive cette exigence.
      requireTLS:
        process.env.SMTP_PORT !== "465" &&
        process.env.SMTP_REQUIRE_TLS !== "false",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await smtp.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject,
      text: body,
    });
    await query(
      "UPDATE mail_outbox SET status='sent',body=$2 WHERE id=$1",
      [id, redact(body)],
    );
    return "sent";
  } catch (e) {
    console.error("Échec SMTP", e instanceof Error ? e.message : "SMTP");
    await query(
      "UPDATE mail_outbox SET status='failed',body=$2 WHERE id=$1",
      [id, redact(body)],
    );
    return "failed";
  }
}
