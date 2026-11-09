/**
 * Registrierung (P4): eigenes Konto mit Name, E-Mail und Passwort anlegen.
 * Neue Konten bekommen die Rolle Spieler; Trainer und Kassenwart werden nicht über die Registrierung vergeben (REQ-SEC-01).
 */
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { MIN_PASSWORD_LENGTH, hashPassword } from "./password";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegistrationInput = { name: string; email: string; password: string; passwordRepeat: string };

/** Prüft die Eingaben; liefert eine verständliche Fehlermeldung oder null. */
export function validateRegistration(input: RegistrationInput): string | null {
  if (input.name.trim().length < 2) return "Bitte deinen Namen angeben.";
  if (!EMAIL.test(input.email.trim())) return "Bitte eine gültige E-Mail-Adresse angeben.";
  if (input.password.length < MIN_PASSWORD_LENGTH)
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`;
  if (input.password !== input.passwordRepeat) return "Die Passwörter stimmen nicht überein.";
  return null;
}

/** Legt einen neuen Spieler an. Wirft einen Fehler mit verständlicher Meldung bei ungültigen Eingaben. */
export async function registerUser(input: RegistrationInput): Promise<User> {
  const error = validateRegistration(input);
  if (error) throw new Error(error);
  const email = input.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new Error("Mit dieser E-Mail gibt es schon ein Konto.");
  return prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash: await hashPassword(input.password), role: "PLAYER" },
  });
}
