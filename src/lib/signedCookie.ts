/**
 * Signierte Cookie-Werte für die Demo-Anmeldung: "<wert>.<signatur>" mit HMAC-SHA256.
 * Wer das Cookie im Browser ändert (z. B. eine andere User-ID einsetzt), macht die Signatur ungültig.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function sign(value: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${mac}`;
}

/** Liefert den ursprünglichen Wert oder null, wenn die Signatur nicht passt. */
export function verify(signed: string | undefined, secret: string): string | null {
  if (!signed) return null;
  const dot = signed.lastIndexOf(".");
  if (dot <= 0) return null;
  const value = signed.slice(0, dot);
  const expected = Buffer.from(sign(value, secret).slice(dot + 1));
  const actual = Buffer.from(signed.slice(dot + 1));
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? value : null;
}

/**
 * Geheimnis zum Signieren: AUTH_SECRET, falls gesetzt, sonst abgeleitet aus DATABASE_URL
 * (enthält das Datenbank-Passwort, ist also ebenfalls geheim und auf Vercel schon vorhanden).
 */
export function cookieSecret(): string {
  const base = process.env.AUTH_SECRET || process.env.DATABASE_URL;
  if (!base) throw new Error("AUTH_SECRET oder DATABASE_URL muss gesetzt sein.");
  return createHash("sha256").update(`squadhq-cookie:${base}`).digest("hex");
}
