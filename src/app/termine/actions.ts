"use server";
/** Server Actions für Termine (REQ-ATT-01/02, #47, #48, #29, Spielplan-Import, Strafvorschläge REQ-PEN-02). */
import type { AttendanceStatus, EventType, LineupSlot } from "@prisma/client";
import { assertMember } from "@/lib/auth";
import { handle, text } from "@/lib/actionUtils";
import { formatDateTime, parseBerlinDateTime, EVENT_TYPE_LABEL } from "@/lib/format";
import {
  createSession,
  importCalendar,
  respond,
  setByTrainer,
  setCancelled,
  setLineup,
  updateSession,
  type SessionInput,
} from "@/services/attendanceService";
import { approvePenalty, discardPenalty } from "@/services/penaltyEngine";
import { notifyTeam } from "@/services/pushService";

/** 1-Klick-Rückmeldung (für sich selbst oder als Stellvertreter). */
export async function respondAction(formData: FormData) {
  await handle(formData, "/termine", async () => {
    const user = await assertMember();
    await respond({
      teamId: user.teamId,
      actor: user,
      memberId: text(formData, "memberId") || user.id,
      sessionId: text(formData, "sessionId"),
      status: text(formData, "status") as AttendanceStatus,
      note: formData.get("note")?.toString(),
    });
  });
}

function readSession(formData: FormData): SessionInput {
  const optionalDate = (key: string) => (text(formData, key) ? parseBerlinDateTime(text(formData, key)) : undefined);
  return {
    type: (text(formData, "type") || "TRAINING") as EventType,
    title: text(formData, "title"),
    startsAt: parseBerlinDateTime(text(formData, "startsAt")),
    responseDeadline: optionalDate("responseDeadline"),
    location: text(formData, "location"),
    meetingPoint: text(formData, "meetingPoint"),
    meetingAt: optionalDate("meetingAt"),
    tasks: text(formData, "tasks"),
    notes: text(formData, "notes"),
    opponent: text(formData, "opponent"),
  };
}

/** MVP-1: Termin anlegen (Trainer, Betreuer). Das Team bekommt eine Push-Nachricht. */
export async function createSessionAction(formData: FormData) {
  await handle(formData, "/termine/neu", async () => {
    const user = await assertMember("termine.verwalten");
    const session = await createSession({ teamId: user.teamId, trainerId: user.id, ...readSession(formData) });
    await notifyTeam(
      user.teamId,
      {
        title: `Neuer Termin: ${session.title}`,
        body: `${EVENT_TYPE_LABEL[session.type]} am ${formatDateTime(session.startsAt)}. Bitte zu- oder absagen.`,
        url: `/termine/${session.id}`,
      },
      { exceptUserId: user.id },
    );
    return { to: `/termine/${session.id}`, info: "Termin angelegt." };
  });
}

/** Termin bearbeiten. */
export async function updateSessionAction(formData: FormData) {
  const id = text(formData, "sessionId");
  await handle(formData, `/termine/${id}/bearbeiten`, async () => {
    const user = await assertMember("termine.verwalten");
    const session = await updateSession({ teamId: user.teamId, sessionId: id, ...readSession(formData) });
    await notifyTeam(
      user.teamId,
      {
        title: `Termin geändert: ${session.title}`,
        body: formatDateTime(session.startsAt),
        url: `/termine/${session.id}`,
      },
      { exceptUserId: user.id },
    );
    return { to: `/termine/${id}`, info: "Änderungen gespeichert." };
  });
}

/** Termin absagen oder wieder ansetzen. */
export async function cancelSessionAction(formData: FormData) {
  await handle(formData, "/termine", async () => {
    const user = await assertMember("termine.verwalten");
    const cancel = text(formData, "cancel") === "1";
    const session = await setCancelled(user.teamId, text(formData, "sessionId"), cancel);
    await notifyTeam(
      user.teamId,
      {
        title: cancel ? `Abgesagt: ${session.title}` : `Findet doch statt: ${session.title}`,
        body: formatDateTime(session.startsAt),
        url: `/termine/${session.id}`,
      },
      { exceptUserId: user.id },
    );
    return { info: cancel ? "Termin abgesagt. Das Team sieht die Absage." : "Termin findet wieder statt." };
  });
}

/** REQ-ATT-02: Anwesenheit nach dem Termin bestätigen (Trainer, Betreuer). */
export async function setAttendanceAction(formData: FormData) {
  await handle(formData, "/termine", async () => {
    const user = await assertMember("anwesenheit.bestaetigen");
    await setByTrainer({
      teamId: user.teamId,
      trainerId: user.id,
      sessionId: text(formData, "sessionId"),
      playerId: text(formData, "playerId"),
      status: text(formData, "status") as AttendanceStatus,
    });
  });
}

/** #29: Aufstellung setzen. */
export async function setLineupAction(formData: FormData) {
  await handle(formData, "/termine", async () => {
    const user = await assertMember("termine.verwalten");
    const slot = text(formData, "lineup");
    await setLineup({
      teamId: user.teamId,
      sessionId: text(formData, "sessionId"),
      playerId: text(formData, "playerId"),
      lineup: slot === "STARTER" || slot === "BENCH" ? (slot as LineupSlot) : null,
      lineupPosition: text(formData, "lineupPosition"),
    });
  });
}

/** REQ-PEN-02: Strafvorschlag freigeben (nur Trainer). */
export async function approveAction(formData: FormData) {
  await handle(formData, "/kasse", async () => {
    const user = await assertMember("strafen.freigeben");
    await approvePenalty(user.teamId, text(formData, "entryId"), user.id);
  });
}

/** REQ-PEN-02: Strafvorschlag verwerfen (nur Trainer). */
export async function discardAction(formData: FormData) {
  await handle(formData, "/kasse", async () => {
    const user = await assertMember("strafen.freigeben");
    await discardPenalty(user.teamId, text(formData, "entryId"), user.id);
  });
}

/** Spielplan-Import aus einer Kalenderdatei (Datei hochladen oder Adresse eines Kalender-Abos). */
export async function importCalendarAction(formData: FormData) {
  await handle(formData, "/termine/import", async () => {
    const user = await assertMember("termine.verwalten");
    let icsText = "";
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > 2_000_000) throw new Error("Die Datei ist zu groß (höchstens 2 MB).");
      icsText = await file.text();
    } else {
      const raw = text(formData, "url")
        .trim()
        .replace(/^webcal:\/\//i, "https://");
      if (!raw) throw new Error("Bitte eine Kalenderdatei auswählen oder eine Kalender-Adresse eingeben.");
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        throw new Error("Die Adresse ist ungültig.");
      }
      if (url.protocol !== "https:") throw new Error("Bitte eine https-Adresse eingeben.");
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
      if (!res?.ok) throw new Error("Der Kalender konnte nicht geladen werden. Stimmt die Adresse?");
      icsText = (await res.text()).slice(0, 2_000_000);
    }
    const result = await importCalendar({
      teamId: user.teamId,
      trainerId: user.id,
      icsText,
      type: (text(formData, "type") || "GAME") as EventType,
      toBerlin: parseBerlinDateTime,
    });
    return {
      to: "/termine",
      info: `Spielplan importiert: ${result.created} neu, ${result.updated} aktualisiert${result.skipped ? `, ${result.skipped} vergangene übersprungen` : ""}.`,
    };
  });
}
