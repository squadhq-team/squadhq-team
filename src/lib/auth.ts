/**
 * REQ-SEC-01: Rollenbasiertes Rechtesystem.
 * Anmeldung mit E-Mail und Passwort (seit P4, Konto über die Registrierung) oder per Demo-Auswahl für die Präsentation.
 * Beides setzt dasselbe Cookie mit der User-ID; Seiten und Services nutzen nur getCurrentUser/requireRole.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { prisma } from "./db";
import { verifyPassword } from "./password";

export const SESSION_COOKIE = "squadhq_user";

export async function getCurrentUser(): Promise<User | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
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

/** Demo-Anmeldung: die Demo-Personen (ohne eigenes Passwort) zur Auswahl. */
export function listLoginUsers(): Promise<User[]> {
  return prisma.user.findMany({ where: { passwordHash: null }, orderBy: [{ role: "asc" }, { name: "asc" }] });
}

/** Merkt sich die angemeldete Person im Cookie. */
export async function startSession(user: User): Promise<User> {
  (await cookies()).set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return user;
}

/** Demo-Anmeldung: nur Demo-Personen ohne Passwort; registrierte Konten brauchen ihr Passwort. */
export async function signIn(userId: string): Promise<User> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.passwordHash) throw new Error("Dieses Konto meldet sich mit E-Mail und Passwort an.");
  return startSession(user);
}

/** Anmeldung mit E-Mail und Passwort. Gleiche Fehlermeldung bei falscher E-Mail und falschem Passwort. */
export async function signInWithPassword(email: string, password: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("E-Mail oder Passwort ist falsch.");
  }
  return startSession(user);
}

/** Abmelden: Cookie löschen. */
export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
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
