/**
 * AttendanceService: Termine und Rückmeldungen (REQ-ATT-01, REQ-ATT-02, #47 Event-Typen, #48 Zusatzinfos,
 * #29 Aufstellung, Spielplan-Import). Alle Funktionen arbeiten nur innerhalb eines Teams (teamId).
 */
import type { AttendanceStatus, EventType, LineupSlot } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PLAYER_CHOICES } from "@/domain/penalties";
import { mayRespondFor, SQUAD_ROLES } from "@/domain/permissions";
import { parseIcs } from "@/domain/ics";
import { syncPenaltyForAttendance } from "./penaltyEngine";
import { logAttendanceChange } from "./auditService";
import { listSquad } from "./teamService";

export const EVENT_TYPES: EventType[] = ["TRAINING", "GAME", "TOURNAMENT", "PARTY", "OTHER"];

/** Termin des eigenen Teams laden oder Fehler werfen. */
export async function getSession(teamId: string, sessionId: string) {
  const session = await prisma.trainingSession.findFirst({ where: { id: sessionId, teamId } });
  if (!session) throw new Error("Diesen Termin gibt es in deinem Team nicht.");
  return session;
}

/**
 * 1-Klick-Rückmeldung: für sich selbst oder als Stellvertreter für ein anderes Mitglied; erlaubt bis zum Beginn.
 */
export async function respond(params: {
  teamId: string;
  actor: { id: string; role: Parameters<typeof mayRespondFor>[0]["role"] };
  memberId: string;
  sessionId: string;
  status: AttendanceStatus;
  note?: string;
}) {
  if (!PLAYER_CHOICES.includes(params.status)) throw new Error("Diesen Status kann nur der Trainer setzen.");
  const session = await getSession(params.teamId, params.sessionId);
  if (session.cancelledAt) throw new Error("Dieser Termin ist abgesagt.");
  if (new Date() > session.startsAt) throw new Error("Der Termin hat schon begonnen.");
  const member = await prisma.user.findFirst({
    where: { id: params.memberId, teamId: params.teamId, deletedAt: null },
  });
  if (!member || !mayRespondFor(params.actor, member))
    throw new Error("Du kannst nur für dich selbst zu- oder absagen.");
  const note = params.note?.trim() || null;
  await prisma.attendance.upsert({
    where: { sessionId_userId: { sessionId: session.id, userId: member.id } },
    create: { sessionId: session.id, userId: member.id, status: params.status, note },
    update: { status: params.status, note },
  });
}

/**
 * Trainer setzt den tatsächlichen Status nach dem Termin.
 * Anwesenheit, Protokolleintrag (MVP-6) und Strafvorschlag werden in einer Transaktion geschrieben, damit alles konsistent bleibt.
 * Ein Protokolleintrag entsteht nur, wenn sich der Status wirklich ändert.
 */
export async function setByTrainer(params: {
  teamId: string;
  trainerId: string;
  sessionId: string;
  playerId: string;
  status: AttendanceStatus;
}) {
  const session = await getSession(params.teamId, params.sessionId);
  const player = await prisma.user.findFirst({ where: { id: params.playerId, teamId: params.teamId } });
  if (!player) throw new Error("Dieses Mitglied gehört nicht zu deinem Team.");
  await prisma.$transaction(async (tx) => {
    const key = { sessionId_userId: { sessionId: session.id, userId: player.id } };
    const before = await tx.attendance.findUnique({ where: key });
    const attendance = await tx.attendance.upsert({
      where: key,
      create: { sessionId: session.id, userId: player.id, status: params.status },
      update: { status: params.status },
    });
    if (before?.status !== params.status) {
      await logAttendanceChange(tx, {
        teamId: params.teamId,
        attendanceId: attendance.id,
        actorId: params.trainerId,
        oldAttendance: before?.status ?? null,
        newAttendance: params.status,
      });
    }
    await syncPenaltyForAttendance(tx, {
      teamId: params.teamId,
      sessionId: session.id,
      eventType: session.type,
      playerId: player.id,
      status: params.status,
      actorId: params.trainerId,
    });
  });
}

export interface SessionInput {
  type: EventType;
  title: string;
  startsAt: Date;
  responseDeadline?: Date;
  location?: string;
  meetingPoint?: string;
  meetingAt?: Date;
  tasks?: string;
  notes?: string;
  opponent?: string;
}

const DEFAULT_TITLE: Record<EventType, string> = {
  TRAINING: "Mannschaftstraining",
  GAME: "Spiel",
  TOURNAMENT: "Turnier",
  PARTY: "Mannschaftsfeier",
  OTHER: "Termin",
};

/** Eingaben eines Termins prüfen und vereinheitlichen. Rückmeldefrist standardmäßig 3 Stunden vor Beginn. */
function sessionData(input: SessionInput, requireFuture: boolean) {
  if (!EVENT_TYPES.includes(input.type)) throw new Error("Unbekannter Termin-Typ.");
  if (Number.isNaN(input.startsAt.getTime())) throw new Error("Bitte Datum und Uhrzeit angeben.");
  if (requireFuture && input.startsAt < new Date()) throw new Error("Der Termin muss in der Zukunft liegen.");
  const responseDeadline = input.responseDeadline ?? new Date(input.startsAt.getTime() - 3 * 60 * 60 * 1000);
  if (Number.isNaN(responseDeadline.getTime())) throw new Error("Bitte eine gültige Rückmeldefrist angeben.");
  if (responseDeadline > input.startsAt) throw new Error("Die Rückmeldefrist muss vor dem Beginn liegen.");
  const meetingAt = input.meetingAt && !Number.isNaN(input.meetingAt.getTime()) ? input.meetingAt : null;
  if (meetingAt && meetingAt > input.startsAt) throw new Error("Der Treffpunkt muss vor dem Beginn liegen.");
  const clean = (v?: string) => v?.trim() || null;
  return {
    type: input.type,
    title: input.title.trim() || DEFAULT_TITLE[input.type],
    startsAt: input.startsAt,
    responseDeadline,
    location: clean(input.location),
    meetingPoint: clean(input.meetingPoint),
    meetingAt,
    tasks: clean(input.tasks),
    notes: clean(input.notes),
    opponent: input.type === "GAME" || input.type === "TOURNAMENT" ? clean(input.opponent) : null,
  };
}

/** MVP-1: Trainer oder Betreuer legt einen Termin an. */
export async function createSession(params: { teamId: string; trainerId: string } & SessionInput) {
  return prisma.trainingSession.create({
    data: { ...sessionData(params, true), teamId: params.teamId, createdById: params.trainerId },
  });
}

/** Termin bearbeiten (auch vergangene, z. B. Uhrzeit korrigieren). */
export async function updateSession(params: { teamId: string; sessionId: string } & SessionInput) {
  const session = await getSession(params.teamId, params.sessionId);
  return prisma.trainingSession.update({ where: { id: session.id }, data: sessionData(params, false) });
}

/** Termin absagen bzw. wieder ansetzen. Abgesagte Termine bleiben sichtbar. */
export async function setCancelled(teamId: string, sessionId: string, cancelled: boolean) {
  const session = await getSession(teamId, sessionId);
  return prisma.trainingSession.update({
    where: { id: session.id },
    data: { cancelledAt: cancelled ? new Date() : null },
  });
}

/** Kommende Termine des Teams (inkl. laufender der letzten 3 Stunden) mit allen Rückmeldungen. */
export function listUpcoming(teamId: string, limit?: number, type?: EventType) {
  return prisma.trainingSession.findMany({
    where: { teamId, startsAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) }, ...(type ? { type } : {}) },
    include: { attendances: true },
    orderBy: { startsAt: "asc" },
    take: limit,
  });
}

/** Vergangene Termine des Teams, neueste zuerst. */
export function listPast(teamId: string, limit = 30, type?: EventType) {
  return prisma.trainingSession.findMany({
    where: { teamId, startsAt: { lt: new Date(Date.now() - 3 * 60 * 60 * 1000) }, ...(type ? { type } : {}) },
    include: { attendances: true },
    orderBy: { startsAt: "desc" },
    take: limit,
  });
}

/** Alle Termine des Teams mit Rückmeldungen (für Trainer und Übersicht), neueste zuerst. */
export function listSessions(teamId: string, type?: EventType) {
  return prisma.trainingSession.findMany({
    where: { teamId, ...(type ? { type } : {}) },
    include: { attendances: true },
    orderBy: { startsAt: "desc" },
  });
}

/** Ein Termin mit allen Mitgliedern des Kaders und ihrem Status (auch ohne Rückmeldung). */
export async function getAttendanceList(teamId: string, sessionId: string) {
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, teamId },
    include: { attendances: true, createdBy: true },
  });
  if (!session) throw new Error("Diesen Termin gibt es in deinem Team nicht.");
  const squad = await listSquad(teamId);
  const byPlayer = new Map(session.attendances.map((a) => [a.userId, a]));
  // Wer nicht mehr im Kader ist, aber eine Rückmeldung hat (z. B. ausgetreten), bleibt in der Liste sichtbar
  const extraIds = session.attendances.map((a) => a.userId).filter((id) => !squad.some((p) => p.id === id));
  const extra = extraIds.length
    ? await prisma.user.findMany({ where: { id: { in: extraIds } }, orderBy: { name: "asc" } })
    : [];
  return {
    session,
    rows: [...squad, ...extra].map((p) => ({ player: p, attendance: byPlayer.get(p.id) ?? null })),
  };
}

/** #29: Aufstellung für Spiele: Startelf oder Bank, optional mit Position. Nur für Spieler, die dabei sind. */
export async function setLineup(params: {
  teamId: string;
  sessionId: string;
  playerId: string;
  lineup: LineupSlot | null;
  lineupPosition?: string;
}) {
  const session = await getSession(params.teamId, params.sessionId);
  if (session.type !== "GAME" && session.type !== "TOURNAMENT")
    throw new Error("Eine Aufstellung gibt es nur bei Spielen und Turnieren.");
  const player = await prisma.user.findFirst({
    where: { id: params.playerId, teamId: params.teamId, role: { in: SQUAD_ROLES } },
  });
  if (!player) throw new Error("Dieses Mitglied gehört nicht zum Kader.");
  if (params.lineup === "STARTER") {
    const starters = await prisma.attendance.count({
      where: { sessionId: session.id, lineup: "STARTER", userId: { not: player.id } },
    });
    if (starters >= 11) throw new Error("Die Startelf ist schon voll (11 Spieler).");
  }
  await prisma.attendance.upsert({
    where: { sessionId_userId: { sessionId: session.id, userId: player.id } },
    create: {
      sessionId: session.id,
      userId: player.id,
      status: "ATTENDING",
      lineup: params.lineup,
      lineupPosition: params.lineupPosition?.trim() || null,
    },
    update: { lineup: params.lineup, lineupPosition: params.lineup ? params.lineupPosition?.trim() || null : null },
  });
}

/**
 * Spielplan-Import aus einer Kalenderdatei (.ics, z. B. von fussball.de oder Google Kalender).
 * Legt nur zukünftige Termine an, schon importierte (gleiche UID) werden aktualisiert statt doppelt angelegt.
 */
export async function importCalendar(params: {
  teamId: string;
  trainerId: string;
  icsText: string;
  type: EventType;
  toBerlin: (local: string) => Date;
}) {
  const events = parseIcs(params.icsText, params.toBerlin);
  if (events.length === 0)
    throw new Error("In der Datei wurden keine Termine gefunden. Ist es eine Kalenderdatei (.ics)?");
  const now = new Date();
  let created = 0;
  let updated = 0;
  for (const e of events.filter((ev) => ev.startsAt > now).slice(0, 200)) {
    const data = sessionData(
      {
        type: params.type,
        title: e.title,
        startsAt: e.startsAt,
        location: e.location ?? undefined,
        notes: e.description ?? undefined,
      },
      false,
    );
    const existing = await prisma.trainingSession.findUnique({
      where: { teamId_importUid: { teamId: params.teamId, importUid: e.uid } },
    });
    if (existing) {
      await prisma.trainingSession.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          startsAt: data.startsAt,
          responseDeadline: data.responseDeadline,
          location: data.location,
        },
      });
      updated++;
    } else {
      await prisma.trainingSession.create({
        data: { ...data, teamId: params.teamId, createdById: params.trainerId, importUid: e.uid },
      });
      created++;
    }
  }
  return { created, updated, skipped: events.length - created - updated };
}

/**
 * Erinnerung (#26): kommende Termine, bei denen die Personen in `userIds` noch nicht geantwortet haben
 * und die Rückmeldefrist in den nächsten `hours` Stunden endet (oder schon läuft).
 */
export async function listMissingResponses(teamId: string, userIds: string[], hours = 48) {
  if (userIds.length === 0) return [];
  const now = new Date();
  const sessions = await prisma.trainingSession.findMany({
    where: {
      teamId,
      cancelledAt: null,
      startsAt: { gt: now },
      responseDeadline: { lte: new Date(now.getTime() + hours * 3600_000) },
    },
    include: { attendances: { where: { userId: { in: userIds } } } },
    orderBy: { startsAt: "asc" },
  });
  return sessions.filter((s) => s.attendances.length < userIds.length);
}

/** Stand der Rückmeldungen eines Termins für die Karten-Anzeige (Dabei / Unsicher / Fehlt / noch offen). */
export function countResponses(attendances: { status: AttendanceStatus }[], squadSize: number) {
  const attending = attendances.filter((a) => a.status === "ATTENDING").length;
  const unsure = attendances.filter((a) => a.status === "UNSURE").length;
  const absent = attendances.filter(
    (a) => a.status === "EXCUSED" || a.status === "INJURED" || a.status === "UNEXCUSED",
  ).length;
  return { attending, unsure, absent, open: Math.max(0, squadSize - attending - unsure - absent) };
}
