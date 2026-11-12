/**
 * REQ-SEC-01: Anmeldung und rollenbasiertes Rechtesystem.
 * - Echte Konten: Supabase Auth (E-Mail + Passwort, Passwort vergessen). Supabase verwaltet Passwort und Sitzung,
 *   die Sitzung steht in signierten Cookies von Supabase; über User.authId ist das Konto mit unserem Nutzer verknüpft.
 * - Demo-Anmeldung für Präsentationen: Personen ohne Konto per Klick, gemerkt in einem eigenen, signierten Cookie.
 *   Abschaltbar mit der Umgebungsvariable DEMO_LOGIN=off.
 * Seiten und Actions nutzen nur getCurrentUser/requireMember/assertMember und merken vom Anmeldeweg nichts.
 * Rechte stehen in einer Tabelle (src/domain/permissions.ts) und werden hier mit `can()` abgefragt.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Team, User } from "@prisma/client";
import { prisma } from "./db";
import { can as roleCan, type Permission } from "@/domain/permissions";
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
      return ensureAppUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        joinCode: data.user.user_metadata?.joinCode,
      });
  }
  if (!isDemoLoginEnabled()) return null;
  const id = verify((await cookies()).get(DEMO_COOKIE)?.value, cookieSecret());
  if (!id) return null;
  return prisma.user.findFirst({ where: { id, authId: null, team: { isDemo: true } } });
}

/** Angemeldetes Mitglied eines Teams (teamId ist gesetzt). */
export type Member = User & { teamId: string; team: Team };

/** Darf das Mitglied das? (Rechte-Tabelle REQ-SEC-01) */
export function can(user: Pick<User, "role">, permission: Permission): boolean {
  return roleCan(user.role, permission);
}

async function loadMember(user: User | null): Promise<Member | null> {
  if (!user?.teamId) return null;
  const team = await prisma.team.findUnique({ where: { id: user.teamId } });
  return team ? ({ ...user, teamId: user.teamId, team } as Member) : null;
}

/**
 * Für Seiten: angemeldet und Mitglied eines Teams, sonst Umleitung zur Anmeldung bzw. zum Team-Beitritt.
 * Mit `permission` zusätzlich Rechteprüfung; ohne Recht geht es zurück zur Startseite.
 */
export async function requireMember(permission?: Permission): Promise<Member> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const member = await loadMember(user);
  if (!member) redirect("/willkommen");
  if (permission && !can(member, permission)) redirect("/start");
  return member;
}

/** Für Server Actions: wirft statt umzuleiten. */
export async function assertMember(permission?: Permission): Promise<Member> {
  const member = await loadMember(await getCurrentUser());
  if (!member) throw new Error("Bitte melde dich an und tritt einem Team bei.");
  if (permission && !can(member, permission)) throw new Error("Keine Berechtigung für diese Aktion.");
  return member;
}

/** Für Seiten ohne Team (Team gründen oder beitreten): nur angemeldet. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

/** Für Server Actions ohne Team. */
export async function assertUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Bitte melde dich an.");
  return user;
}

/** Demo-Anmeldung: die Personen des Demo-Teams zur Auswahl; leer, wenn die Demo-Anmeldung aus ist. */
export async function listLoginUsers(): Promise<User[]> {
  if (!isDemoLoginEnabled()) return [];
  return prisma.user.findMany({
    where: { authId: null, team: { isDemo: true } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

/** Demo-Anmeldung: nur Personen des Demo-Teams. Meldet eine laufende Supabase-Sitzung vorher ab. */
export async function signIn(userId: string): Promise<User> {
  if (!isDemoLoginEnabled()) throw new Error("Die Demo-Anmeldung ist abgeschaltet.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { team: true } });
  if (user.authId || !user.team?.isDemo) throw new Error("Dieses Konto meldet sich mit E-Mail und Passwort an.");
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
  return ensureAppUser({
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.name,
    joinCode: data.user.user_metadata?.joinCode,
  });
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

/** Startseite nach der Anmeldung: ohne Team zum Gründen/Beitreten, sonst die Übersicht. */
export function homeFor(user: Pick<User, "teamId">): string {
  return user.teamId ? "/start" : "/willkommen";
}

/** Bestätigungsmail nach der Registrierung erneut schicken (wenn sie nicht ankam). */
export async function resendConfirmation(email: string, redirectTo: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Die Anmeldung mit E-Mail ist noch nicht eingerichtet.");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  });
  if (error && /rate limit|too many|security purposes/i.test(error.message))
    throw new Error(translateAuthError(error.message));
}
