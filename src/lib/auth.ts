/**
 * REQ-SEC-01: Rollenbasiertes Rechtesystem.
 * Prototyp: Anmeldung per Demo-Auswahl (Cookie mit User-ID). Später durch Supabase Auth ersetzbar,
 * ohne dass Seiten oder Services sich ändern, weil alle nur getCurrentUser/requireRole nutzen.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { prisma } from "./db";

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

export function homeFor(role: Role): string {
  return role === "TRAINER" ? "/trainer" : "/spieler";
}

/** Welche Bereiche eine Rolle sehen darf (Navigation). */
export function areasFor(role: Role): { href: string; label: string }[] {
  if (role === "TRAINER") return [{ href: "/trainer", label: "Trainings" }];
  return [{ href: "/spieler", label: "Mein Bereich" }];
}
