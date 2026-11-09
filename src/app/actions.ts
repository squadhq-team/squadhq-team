"use server";
/**
 * Server Actions: dünne Schicht zwischen UI und Services.
 * Jede Action prüft zuerst die Rolle (REQ-SEC-01) und ruft dann genau einen Service auf.
 * Fehler aus Formularen mit Eingaben (Registrierung, Anmelden, Training anlegen, Teilzahlung) werden als
 * Hinweis auf der Seite angezeigt (?fehler=…), statt die Seite abstürzen zu lassen.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@prisma/client";
import { assertRole, homeFor, signIn, signInWithPassword, signOut, startSession } from "@/lib/auth";
import { registerUser } from "@/lib/registration";
import { parseBerlinDateTime, parseEuroToCents } from "@/lib/format";
import type { PaymentMethod } from "@/domain/penalties";
import { createSession, respond, setByTrainer } from "@/services/attendanceService";
import { approvePenalty, discardPenalty } from "@/services/penaltyEngine";
import { recordPayment } from "@/services/paymentService";

const text = (formData: FormData, key: string) => formData.get(key)?.toString() ?? "";
const message = (e: unknown) => (e instanceof Error ? e.message : "Unbekannter Fehler.");
const withError = (path: string, e: unknown) => `${path}?fehler=${encodeURIComponent(message(e))}`;

/** Demo-Anmeldung per Klick (Präsentation). */
export async function login(formData: FormData) {
  const user = await signIn(text(formData, "userId"));
  redirect(homeFor(user.role));
}

/** Anmeldung mit E-Mail und Passwort. */
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

/** Registrierung: neues Konto als Spieler anlegen und direkt anmelden. */
export async function registerAction(formData: FormData) {
  let target: string;
  try {
    const user = await registerUser({
      name: text(formData, "name"),
      email: text(formData, "email"),
      password: text(formData, "password"),
      passwordRepeat: text(formData, "passwordRepeat"),
    });
    await startSession(user);
    target = homeFor(user.role);
  } catch (e) {
    target = withError("/registrieren", e);
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
