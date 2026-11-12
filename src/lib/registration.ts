/**
 * Registrierung: neues Konto bei Supabase Auth anlegen und mit einem SquadHQ-Nutzer (Tabelle User) verknüpfen.
 * Das Passwort verwaltet ausschließlich Supabase; in unserer Datenbank stehen nur Name, E-Mail, Rolle und authId.
 * Neue Konten haben noch kein Team. Danach gründen sie ein Team (werden Trainer) oder treten mit dem Team-Code bei
 * (werden Spieler); weitere Rollen vergibt der Trainer (REQ-SEC-01, src/services/teamService.ts).
 */
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { createSupabaseServerClient } from "./supabase";
import { joinTeam } from "@/services/teamService";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mindestlänge für Passwörter (muss mindestens der Einstellung in Supabase entsprechen, Standard dort: 6). */
export const MIN_PASSWORD_LENGTH = 8;

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  passwordRepeat: string;
  /** optional: Team-Code aus der Einladung; nach dem ersten Anmelden tritt das Konto automatisch bei */
  joinCode?: string;
};

/** Prüft die Eingaben; liefert eine verständliche Fehlermeldung oder null. */
export function validateRegistration(input: RegistrationInput): string | null {
  if (input.name.trim().length < 2) return "Bitte deinen Namen angeben.";
  if (!EMAIL.test(input.email.trim())) return "Bitte eine gültige E-Mail-Adresse angeben.";
  const passwordError = validateNewPassword(input.password, input.passwordRepeat);
  if (passwordError) return passwordError;
  return null;
}

/** Prüft ein neues Passwort (Registrierung und „Passwort vergessen“). */
export function validateNewPassword(password: string, repeat: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`;
  if (password !== repeat) return "Die Passwörter stimmen nicht überein.";
  return null;
}

/**
 * Legt den SquadHQ-Nutzer zu einem Supabase-Konto an oder liefert den vorhandenen.
 * Wird bei der Registrierung und bei jeder Anmeldung aufgerufen, damit Konto und Nutzer immer zusammenpassen.
 */
export async function ensureAppUser(auth: {
  id: string;
  email?: string | null;
  name?: string | null;
  joinCode?: string | null;
}): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { authId: auth.id } });
  if (existing) return existing;
  const email = auth.email?.trim().toLowerCase() || null;
  // Gleiche E-Mail, aber neues Supabase-Konto (z. B. Konto in Supabase gelöscht und neu registriert): neu verknüpfen
  const sameEmail = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (sameEmail) return prisma.user.update({ where: { id: sameEmail.id }, data: { authId: auth.id } });
  const user = await prisma.user.create({
    data: {
      authId: auth.id,
      email,
      name: auth.name?.trim() || email?.split("@")[0] || "Neues Mitglied",
      role: "PLAYER",
      teamId: null,
    },
  });
  if (auth.joinCode) {
    try {
      await joinTeam(user.id, auth.joinCode);
      return prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    } catch {
      // Code ungültig: dann wählt die Person auf /willkommen selbst
    }
  }
  return user;
}

/**
 * Registriert ein neues Konto. `confirmRedirectTo` ist die Adresse, zu der der Bestätigungslink in der E-Mail führt.
 * Liefert needsConfirmation = true, wenn Supabase eine Bestätigung per E-Mail verlangt (dann gibt es noch keine Sitzung).
 */
export async function registerUser(
  input: RegistrationInput,
  confirmRedirectTo: string,
): Promise<{ user: User; needsConfirmation: boolean }> {
  const error = validateRegistration(input);
  if (error) throw new Error(error);
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Die Registrierung ist noch nicht eingerichtet.");

  const email = input.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new Error("Mit dieser E-Mail gibt es schon ein Konto.");

  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { name: input.name.trim(), joinCode: input.joinCode?.trim() || null },
      emailRedirectTo: confirmRedirectTo,
    },
  });
  if (authError) throw new Error(translateAuthError(authError.message));
  // Supabase meldet eine schon registrierte E-Mail nicht als Fehler, sondern liefert ein Konto ohne Identitäten
  if (!data.user || data.user.identities?.length === 0) throw new Error("Mit dieser E-Mail gibt es schon ein Konto.");

  const user = await ensureAppUser({ id: data.user.id, email, name: input.name, joinCode: input.joinCode });
  return { user, needsConfirmation: !data.session };
}

/** Übersetzt die englischen Fehlermeldungen von Supabase Auth für die Oberfläche. */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-Mail oder Passwort ist falsch.";
  if (m.includes("email not confirmed"))
    return "Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der Mail. Keine Mail da? Schau auch im Spam-Ordner nach.";
  if (m.includes("already registered")) return "Mit dieser E-Mail gibt es schon ein Konto.";
  if (m.includes("password should be") || m.includes("weak password")) return "Das Passwort ist zu schwach.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Zu viele Versuche. Bitte in ein paar Minuten noch einmal.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "Das neue Passwort muss sich vom alten unterscheiden.";
  if (m.includes("invalid email") || m.includes("unable to validate email"))
    return "Bitte eine gültige E-Mail-Adresse angeben.";
  return "Das hat nicht geklappt. Bitte noch einmal versuchen.";
}
