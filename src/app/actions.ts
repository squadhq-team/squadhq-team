"use server";
/**
 * Server Actions: dünne Schicht zwischen UI und Services.
 * Jede Action prüft zuerst die Rolle (REQ-SEC-01) und ruft dann genau einen Service auf.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@prisma/client";
import { assertRole, homeFor, signIn, signOut } from "@/lib/auth";
import { respond, setByTrainer } from "@/services/attendanceService";
import { approvePenalty, discardPenalty } from "@/services/penaltyEngine";

export async function login(formData: FormData) {
  const user = await signIn(String(formData.get("userId")));
  redirect(homeFor(user.role));
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
    sessionId: String(formData.get("sessionId")),
    status: String(formData.get("status")) as AttendanceStatus,
    note: formData.get("note")?.toString(),
  });
  revalidatePath("/spieler");
}

/** REQ-ATT-02: Trainer bestätigt die Anwesenheit nach dem Training */
export async function setAttendanceAction(formData: FormData) {
  const user = await assertRole("TRAINER");
  const sessionId = String(formData.get("sessionId"));
  await setByTrainer({
    trainerId: user.id,
    sessionId,
    playerId: String(formData.get("playerId")),
    status: String(formData.get("status")) as AttendanceStatus,
  });
  revalidatePath(`/trainer/training/${sessionId}`);
}

/** REQ-PEN-02: Strafvorschlag freigeben */
export async function approveAction(formData: FormData) {
  const user = await assertRole("TRAINER");
  await approvePenalty(String(formData.get("entryId")), user.id);
  revalidatePath(`/trainer/training/${formData.get("sessionId")}`);
}

/** REQ-PEN-02: Strafvorschlag verwerfen */
export async function discardAction(formData: FormData) {
  const user = await assertRole("TRAINER");
  await discardPenalty(String(formData.get("entryId")), user.id);
  revalidatePath(`/trainer/training/${formData.get("sessionId")}`);
}
