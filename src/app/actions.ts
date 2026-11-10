"use server";
/**
 * Server Actions: dünne Schicht zwischen UI und Services.
 * Jede Action prüft zuerst die Rolle (REQ-SEC-01) und ruft dann genau einen Service auf.
 * Fehler aus Formularen mit Eingaben (Registrierung, Anmelden, Passwort, Training anlegen, Teilzahlung) werden als
 * Hinweis auf der Seite angezeigt (?fehler=…), Erfolgsmeldungen als ?info=…, statt die Seite abstürzen zu lassen.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@prisma/client";
import { headers } from "next/headers";
import {
  assertRole,
  getCurrentUser,
  homeFor,
  requestPasswordReset,
  signIn,
  signInWithPassword,
  signOut,
  updatePassword,
} from "@/lib/auth";
import { registerUser } from "@/lib/registration";
import { parseBerlinDateTime, parseEuroToCents } from "@/lib/format";
import type { PaymentMethod } from "@/domain/penalties";
import { createSession, respond, setByTrainer } from "@/services/attendanceService";
import { approvePenalty, discardPenalty } from "@/services/penaltyEngine";
import { recordPayment } from "@/services/paymentService";

const text = (formData: FormData, key: string) => formData.get(key)?.toString() ?? "";
const message = (e: unknown) => (e instanceof Error ? e.message : "Unbekannter Fehler.");
const withError = (path: string, e: unknown) => `${path}?fehler=${encodeURIComponent(message(e))}`;
const withInfo = (path: string, info: string) => `${path}?info=${encodeURIComponent(info)}`;

/** Adresse der App (z. B. https://squadhq-omega.vercel.app) für Links in Mails von Supabase. */
async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Demo-Anmeldung per Klick (Präsentation). */
export async function login(formData: FormData) {
  const user = await signIn(text(formData, "userId"));
  redirect(homeFor(user.role));
}

/** Anmeldung mit E-Mail und Passwort (Supabase Auth). */
export async function loginWithPassword(formData: FormData) {
  let target: string;
  try {
    const user = await signInWithPassword(text(formData, "email"), text(formData, "password"));
    target = homeFor(user.role);
  } catch (e) {
    target = withError("/", e);
  }
  redirect(target);
}

/**
 * Registrierung: neues Konto bei Supabase Auth, verknüpft mit einem Spieler.
 * Verlangt Supabase eine E-Mail-Bestätigung, geht es danach über den Link in der Mail weiter.
 */
export async function registerAction(formData: FormData) {
  let target: string;
  try {
    const { user, needsConfirmation } = await registerUser(
      {
        name: text(formData, "name"),
        email: text(formData, "email"),
        password: text(formData, "password"),
        passwordRepeat: text(formData, "passwordRepeat"),
      },
      `${await siteOrigin()}/auth/callback`,
    );
    target = needsConfirmation
      ? withInfo(
          "/",
          "Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link in der Mail, die wir dir geschickt haben.",
        )
      : homeFor(user.role);
  } catch (e) {
    target = withError("/registrieren", e);
  }
  redirect(target);
}

/** Passwort vergessen: Mail mit Link anfordern. Die Antwort ist immer gleich, damit niemand Konten ausforschen kann. */
export async function requestPasswordResetAction(formData: FormData) {
  let target: string;
  try {
    await requestPasswordReset(text(formData, "email"), `${await siteOrigin()}/auth/callback?next=/passwort-neu`);
    target = withInfo(
      "/",
      "Wenn es zu dieser E-Mail ein Konto gibt, ist eine Mail mit einem Link zum Zurücksetzen unterwegs. Schau auch im Spam-Ordner nach.",
    );
  } catch (e) {
    target = withError("/passwort-vergessen", e);
  }
  redirect(target);
}

/** Neues Passwort setzen (nach dem Link aus der Mail „Passwort vergessen“). */
export async function updatePasswordAction(formData: FormData) {
  let target: string;
  try {
    await updatePassword(text(formData, "password"), text(formData, "passwordRepeat"));
    const user = await getCurrentUser();
    target = withInfo(user ? homeFor(user.role) : "/", "Dein Passwort ist geändert.");
  } catch (e) {
    target = withError("/passwort-neu", e);
  }
  redirect(target);
}

export async function logout() {
  await signOut();
  redirect("/");
}

/** REQ-ATT-01: 1-Klick-Rückmeldung des Spielers */
export async function respondAction(formData: FormData) {
  const user = await assertRole("PLAYER");
  await respond({
    playerId: user.id,
    sessionId: text(formData, "sessionId"),
    status: text(formData, "status") as AttendanceStatus,
    note: formData.get("note")?.toString(),
  });
  revalidatePath("/spieler");
}

/** MVP-1: Trainer legt ein Training an */
export async function createSessionAction(formData: FormData) {
  const user = await assertRole("TRAINER");
  let target: string;
  try {
    const deadline = text(formData, "responseDeadline");
    const session = await createSession({
      trainerId: user.id,
      title: text(formData, "title"),
      startsAt: parseBerlinDateTime(text(formData, "startsAt")),
      responseDeadline: deadline ? parseBerlinDateTime(deadline) : undefined,
      location: text(formData, "location"),
    });
    target = `/trainer/training/${session.id}`;
  } catch (e) {
    target = withError("/trainer/neu", e);
  }
  revalidatePath("/trainer");
  revalidatePath("/spieler");
  redirect(target);
}

/** REQ-ATT-02: Trainer bestätigt die Anwesenheit nach dem Training */
export async function setAttendanceAction(formData: FormData) {
  const user = await assertRole("TRAINER");
  const sessionId = text(formData, "sessionId");
  await setByTrainer({
    trainerId: user.id,
    sessionId,
    playerId: text(formData, "playerId"),
    status: text(formData, "status") as AttendanceStatus,
  });
  revalidatePath(`/trainer/training/${sessionId}`);
}

/** REQ-PEN-02: Strafvorschlag freigeben */
export async function approveAction(formData: FormData) {
  const user = await assertRole("TRAINER");
  await approvePenalty(text(formData, "entryId"), user.id);
  revalidatePath(`/trainer/training/${text(formData, "sessionId")}`);
}

/** REQ-PEN-02: Strafvorschlag verwerfen */
export async function discardAction(formData: FormData) {
  const user = await assertRole("TRAINER");
  await discardPenalty(text(formData, "entryId"), user.id);
  revalidatePath(`/trainer/training/${text(formData, "sessionId")}`);
}

/** REQ-PEN-04 (MVP-5): Kassenwart verbucht eine Zahlung, 1 Klick = ganzer offener Rest, mit Betrag = Teilzahlung */
export async function payAction(formData: FormData) {
  const user = await assertRole("CASHIER");
  const method = text(formData, "method") as PaymentMethod;
  if (method !== "CASH" && method !== "PAYPAL") throw new Error("Unbekannte Zahlungsart.");
  const amount = text(formData, "amount").trim();
  let target: string | null = null;
  try {
    await recordPayment({
      entryId: text(formData, "entryId"),
      actorId: user.id,
      method,
      amountCents: amount ? parseEuroToCents(amount) : undefined,
    });
  } catch (e) {
    target = withError("/kasse", e);
  }
  revalidatePath("/kasse");
  if (target) redirect(target);
}
