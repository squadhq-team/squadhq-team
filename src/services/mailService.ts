/**
 * MailService: eigene Mails der App (Erinnerung vor der Rückmeldefrist, #26) über SMTP, z. B. ein Gmail-Konto des Teams.
 * Läuft nur, wenn SMTP_USER und SMTP_PASS gesetzt sind (Anleitung: docs/setup.md); sonst passiert nichts.
 * Mails zur Anmeldung (Bestätigen, Passwort vergessen) verschickt weiterhin Supabase Auth.
 */
import nodemailer from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
  close(): void;
}

export function mailConfigured(): boolean {
  return !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
}

/** Adresse der App für Links in Mails: SITE_URL, sonst die Produktions-Adresse auf Vercel, sonst lokal. */
export function appUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** Öffnet eine Verbindung zum Mailserver (mit wenigen parallelen Verbindungen). Nach dem Versand `close()` aufrufen. */
export function createMailer(): Mailer | null {
  if (!mailConfigured()) return null;
  const user = process.env.SMTP_USER!;
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    pool: true,
    maxConnections: 2,
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass: process.env.SMTP_PASS!.replace(/\s/g, "") },
  });
  const from = { name: process.env.SMTP_FROM_NAME || "SquadHQ", address: user };
  return {
    async send(message) {
      await transport.sendMail({ from, ...message });
    },
    close() {
      transport.close();
    },
  };
}

/** Sonderzeichen für den HTML-Teil einer Mail entschärfen (Namen und Titel kommen von Nutzern). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
