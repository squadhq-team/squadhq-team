/**
 * Ziel der Links in Mails von Supabase Auth (E-Mail bestätigen, Passwort vergessen).
 * Tauscht Code bzw. Token aus dem Link gegen eine Sitzung und leitet weiter (?next=/passwort-neu oder zur Startseite).
 * In Supabase unter Authentication → URL Configuration muss diese Adresse als Redirect URL erlaubt sein.
 */
import { type NextRequest, NextResponse } from "next/server";
import { exchangeAuthLink, getCurrentUser, homeFor } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get("next");
  // Nur Pfade innerhalb der App, keine fremden Adressen (Schutz vor Weiterleitung auf fremde Seiten)
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  const ok = await exchangeAuthLink({
    code: searchParams.get("code"),
    tokenHash: searchParams.get("token_hash"),
    type: searchParams.get("type"),
  });
  if (ok) {
    if (safeNext) return NextResponse.redirect(new URL(safeNext, origin));
    // Bestätigungslink nach der Registrierung: direkt in den eigenen Bereich
    const user = await getCurrentUser();
    const url = new URL(user ? homeFor(user.role) : "/", origin);
    url.searchParams.set("info", "Deine E-Mail-Adresse ist bestätigt. Willkommen bei SquadHQ!");
    return NextResponse.redirect(url);
  }
  const url = new URL("/", origin);
  url.searchParams.set("fehler", "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.");
  return NextResponse.redirect(url);
}
