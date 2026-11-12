"use server";
/**
 * Server Actions für Anmeldung, Team gründen/beitreten, Profil, Konto und Push.
 * Weitere Actions je Bereich: termine/actions.ts, kasse/actions.ts, team/actions.ts.
 * Jede Action prüft zuerst Anmeldung und Recht (REQ-SEC-01) und ruft dann einen Service auf.
 * Reaktion auf Erfolg/Fehler einheitlich über handle() (src/lib/actionUtils.ts).
 */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  assertMember,
  assertUser,
  getCurrentUser,
  homeFor,
  requestPasswordReset,
  resendConfirmation,
  signInWithPassword,
  signOut,
  updatePassword,
} from "@/lib/auth";
import { registerUser } from "@/lib/registration";
import { handle, text, withParam } from "@/lib/actionUtils";
import { createTeam, deleteAccount, joinTeam, leaveTeam, updateProfile } from "@/services/teamService";
import { removeSubscription, saveSubscription } from "@/services/pushService";

/** Adresse der App (z. B. https://squadhq-omega.vercel.app) für Links in Mails von Supabase. */
async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Anmeldung mit E-Mail und Passwort (Supabase Auth). */
export async function loginWithPassword(formData: FormData) {
  await handle(formData, "/", async () => {
    const user = await signInWithPassword(text(formData, "email"), text(formData, "password"));
    const code = text(formData, "code").trim();
    if (!user.teamId && code) return { to: `/willkommen?code=${encodeURIComponent(code)}` };
    return { to: homeFor(user) };
  });
}

/**
 * Registrierung: neues Konto bei Supabase Auth. Mit Team-Code aus der Einladung tritt es direkt dem Team bei.
 * Verlangt Supabase eine E-Mail-Bestätigung, geht es danach über den Link in der Mail weiter.
 */
export async function registerAction(formData: FormData) {
  await handle(formData, "/registrieren", async () => {
    const email = text(formData, "email");
    const { user, needsConfirmation } = await registerUser(
      {
        name: text(formData, "name"),
        email,
        password: text(formData, "password"),
        passwordRepeat: text(formData, "passwordRepeat"),
        joinCode: text(formData, "code"),
      },
      `${await siteOrigin()}/auth/callback`,
    );
    if (needsConfirmation) return { to: `/bestaetigen?email=${encodeURIComponent(email.trim().toLowerCase())}` };
    return { to: homeFor(user) };
  });
}

/** Bestätigungsmail erneut schicken. */
export async function resendConfirmationAction(formData: FormData) {
  await handle(formData, "/bestaetigen", async () => {
    await resendConfirmation(text(formData, "email"), `${await siteOrigin()}/auth/callback`);
    return { info: "Wir haben die Mail noch einmal geschickt. Schau auch im Spam-Ordner nach." };
  });
}

/** Passwort vergessen: Mail mit Link anfordern. Die Antwort ist immer gleich, damit niemand Konten ausforschen kann. */
export async function requestPasswordResetAction(formData: FormData) {
  await handle(formData, "/passwort-vergessen", async () => {
    await requestPasswordReset(text(formData, "email"), `${await siteOrigin()}/auth/callback?next=/passwort-neu`);
    return {
      to: "/",
      info: "Wenn es zu dieser E-Mail ein Konto gibt, ist eine Mail mit einem Link zum Zurücksetzen unterwegs. Schau auch im Spam-Ordner nach.",
    };
  });
}

/** Neues Passwort setzen (nach „Passwort vergessen“ oder im Profil). */
export async function updatePasswordAction(formData: FormData) {
  await handle(formData, "/passwort-neu", async () => {
    await updatePassword(text(formData, "password"), text(formData, "passwordRepeat"));
    const user = await getCurrentUser();
    return { to: user ? homeFor(user) : "/", info: "Dein Passwort ist geändert." };
  });
}

export async function logout() {
  await signOut();
  redirect("/");
}

/** Team gründen: wer gründet, wird Trainer. */
export async function createTeamAction(formData: FormData) {
  await handle(formData, "/willkommen", async () => {
    const user = await assertUser();
    await createTeam(user.id, text(formData, "name"));
    return { to: "/team", info: "Dein Team ist angelegt. Teile jetzt den Team-Code mit deiner Mannschaft." };
  });
}

/** Mit Team-Code beitreten: neue Mitglieder sind Spieler. */
export async function joinTeamAction(formData: FormData) {
  await handle(formData, "/willkommen", async () => {
    const user = await assertUser();
    const team = await joinTeam(user.id, text(formData, "code"));
    return { to: "/start", info: `Willkommen bei ${team.name}!` };
  });
}

/** Eigenes Profil speichern (#51). */
export async function updateProfileAction(formData: FormData) {
  await handle(formData, "/profil", async () => {
    const user = await assertUser();
    await updateProfile(user.id, {
      name: text(formData, "name"),
      phone: text(formData, "phone"),
      position: text(formData, "position"),
      shirtNumber: text(formData, "shirtNumber"),
    });
    return { info: "Profil gespeichert." };
  });
}

/** Team verlassen. */
export async function leaveTeamAction(formData: FormData) {
  await handle(formData, "/profil", async () => {
    const user = await assertMember();
    await leaveTeam(user.id);
    return { to: "/willkommen", info: "Du hast das Team verlassen." };
  });
}

/** Konto löschen (Datenschutz). Verlangt die Eingabe LÖSCHEN als Bestätigung. */
export async function deleteAccountAction(formData: FormData) {
  let target = "/";
  try {
    if (text(formData, "confirm").trim().toUpperCase() !== "LÖSCHEN")
      throw new Error("Bitte zur Bestätigung LÖSCHEN eingeben.");
    const user = await assertUser();
    await deleteAccount(user.id);
    await signOut();
    target = withParam("/", "info", "Dein Konto ist gelöscht.");
  } catch (e) {
    target = withParam("/profil", "fehler", e instanceof Error ? e.message : "Fehler beim Löschen.");
  }
  redirect(target);
}

/** Push-Benachrichtigungen an diesem Gerät an- oder abmelden (#26). Wird vom Browser-Skript aufgerufen. */
export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const user = await assertUser();
  await saveSubscription(user.id, sub);
}

export async function deletePushSubscription(endpoint: string) {
  const user = await assertUser();
  await removeSubscription(user.id, endpoint);
}
