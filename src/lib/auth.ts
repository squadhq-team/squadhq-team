/**
 * REQ-SEC-01: Anmeldung und rollenbasiertes Rechtesystem.
 * - Echte Konten: Supabase Auth (E-Mail + Passwort, Passwort vergessen). Supabase verwaltet Passwort und Sitzung,
 *   die Sitzung steht in signierten Cookies von Supabase; über User.authId ist das Konto mit unserem Nutzer verknüpft.
 * - Demo-Anmeldung für Präsentationen: Personen ohne Konto per Klick, gemerkt in einem eigenen, signierten Cookie.
 *   Abschaltbar mit der Umgebungsvariable DEMO_LOGIN=off.
 * Seiten und Services nutzen nur getCurrentUser/requireRole/assertRole und merken vom Anmeldeweg nichts.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { prisma } from "./db";
import { cookieSecret, sign, verify } from "./signedCookie";
import { createSupabaseServerClient, isSupabaseConfigured } from "./supabase";
import { ensureAppUser, translateAuthError, validateNewPassword } from "./registration";

export const DEMO_COOKIE = "squadhq_demo";

/** Anmeldung mit E-Mail und Passwort möglich? (Supabase ist eingerichtet) */
export function isEmailLoginEnabled(): boolean {
  return isSupabaseConfigured();
}

/** Demo-Anmeldung an? Standard: an (für Präsentationen); DEMO_LOGIN=off schaltet sie ab. */
export function isDemoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN !== "off";
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    // getUser() prüft die Sitzung bei Supabase (nicht nur das Cookie), deshalb ist das Ergebnis vertrauenswürdig
    const { data } = await supabase.auth.getUser();
    if (data.user)
      return ensureAppUser({ id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name });
  }
  if (!isDemoLoginEnabled()) return null;
  const id = verify((await cookies()).get(DEMO_COOKIE)?.value, cookieSecret());
  if (!id) return null;
  return prisma.user.findFirst({ where: { id, authId: null } });
}

/** Für Seiten: leitet zur Anmeldung um, wenn die Rolle nicht passt. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/** Für Server Actions: wirft statt umzuleiten. */
export async function assertRole(...roles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) throw new Error("Keine Berechtigung für diese Aktion.");
  return user;
}

/** Demo-Anmeldung: die Demo-Personen (ohne Supabase-Konto) zur Auswahl; leer, wenn die Demo-Anmeldung aus ist. */
export async function listLoginUsers(): Promise<User[]> {
  if (!isDemoLoginEnabled()) return [];
  return prisma.user.findMany({ where: { authId: null }, orderBy: [{ role: "asc" }, { name: "asc" }] });
}

/** Demo-Anmeldung: nur Demo-Personen ohne Konto. Meldet eine laufende Supabase-Sitzung vorher ab. */
export async function signIn(userId: string): Promise<User> {
  if (!isDemoLoginEnabled()) throw new Error("Die Demo-Anmeldung ist abgeschaltet.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.authId) throw new Error("Dieses Konto meldet sich mit E-Mail und Passwort an.");
  await (await createSupabaseServerClient())?.auth.signOut();
  (await cookies()).set(DEMO_COOKIE, sign(user.id, cookieSecret()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return user;
}

/** Anmeldung mit E-Mail und Passwort über Supabase Auth. */
export async function signInWithPassword(email: string, password: string): Promise<User> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Die Anmeldung mit E-Mail ist noch nicht eingerichtet.");
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) throw new Error(translateAuthError(error?.message ?? ""));
  (await cookies()).delete(DEMO_COOKIE);
  return ensureAppUser({ id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name });
}

/** Abmelden: Supabase-Sitzung beenden und Demo-Cookie löschen. */
export async function signOut(): Promise<void> {
  await (await createSupabaseServerClient())?.auth.signOut();
  (await cookies()).delete(DEMO_COOKIE);
}

/**
 * Passwort vergessen: Supabase schickt eine Mail mit Link. Der Link führt über /auth/callback zu /passwort-neu.
 * Gibt aus Datenschutzgründen nie preis, ob es zu der E-Mail ein Konto gibt.
 */
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Passwort zurücksetzen ist noch nicht eingerichtet.");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
  if (error && /rate limit|too many/i.test(error.message)) throw new Error(translateAuthError(error.message));
}

/** Neues Passwort setzen; braucht die Sitzung aus dem Link in der Mail (oder eine normale Anmeldung). */
export async function updatePassword(password: string, repeat: string): Promise<void> {
  const problem = validateNewPassword(password, repeat);
  if (problem) throw new Error(problem);
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !data.user) throw new Error("Der Link ist abgelaufen. Bitte fordere einen neuen an.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(translateAuthError(error.message));
}

/**
 * Link aus einer Mail von Supabase (Bestätigung, Passwort vergessen) gegen eine Sitzung tauschen.
 * - `code`: Standard-Link von Supabase; klappt nur im selben Browser, in dem die Mail angefordert wurde.
 * - `token_hash` + `type`: Link aus den angepassten Mail-Vorlagen (docs/setup.md); klappt auf jedem Gerät.
 */
export async function exchangeAuthLink(params: {
  code?: string | null;
  tokenHash?: string | null;
  type?: string | null;
}): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  let ok = false;
  if (params.tokenHash && (params.type === "email" || params.type === "recovery" || params.type === "signup")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: params.tokenHash, type: params.type });
    ok = !error;
  } else if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    ok = !error;
  }
  if (ok) (await cookies()).delete(DEMO_COOKIE);
  return ok;
}

export function homeFor(role: Role): string {
  if (role === "TRAINER") return "/trainer";
  if (role === "CASHIER") return "/kasse";
  return "/spieler";
}

/** Welche Bereiche eine Rolle sehen darf (Navigation). Muss zu den requireRole-Aufrufen der Seiten passen. */
export function areasFor(role: Role): { href: string; label: string }[] {
  if (role === "TRAINER")
    return [
      { href: "/trainer", label: "Trainings" },
      { href: "/kasse", label: "Teamkasse" },
      { href: "/protokoll", label: "Protokoll" },
    ];
  if (role === "CASHIER")
    return [
      { href: "/kasse", label: "Teamkasse" },
      { href: "/protokoll", label: "Protokoll" },
    ];
  return [{ href: "/spieler", label: "Mein Bereich" }];
}
