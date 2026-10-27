/**
 * AttendanceService: Rückmeldungen der Spieler und Anwesenheitsliste des Trainers (REQ-ATT-01, REQ-ATT-02).
 */
import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PLAYER_CHOICES } from "@/domain/penalties";
import { syncPenaltyForAttendance } from "./penaltyEngine";

/** Spieler meldet sich per 1-Klick zurück; erlaubt bis zum Trainingsbeginn. */
export async function respond(params: { playerId: string; sessionId: string; status: AttendanceStatus; note?: string }) {
  if (!PLAYER_CHOICES.includes(params.status)) throw new Error("Diesen Status kann nur der Trainer setzen.");
  const session = await prisma.trainingSession.findUniqueOrThrow({ where: { id: params.sessionId } });
  if (new Date() > session.startsAt) throw new Error("Das Training hat schon begonnen.");
  const note = params.note?.trim() || null;
  await prisma.attendance.upsert({
    where: { sessionId_userId: { sessionId: params.sessionId, userId: params.playerId } },
    create: { sessionId: params.sessionId, userId: params.playerId, status: params.status, note },
    update: { status: params.status, note },
  });
}

/**
 * Trainer setzt den tatsächlichen Status nach dem Training.
 * Anwesenheit und Strafvorschlag werden in einer Transaktion geschrieben, damit beides konsistent bleibt.
 */
export async function setByTrainer(params: { trainerId: string; sessionId: string; playerId: string; status: AttendanceStatus }) {
  await prisma.$transaction(async (tx) => {
    await tx.attendance.upsert({
      where: { sessionId_userId: { sessionId: params.sessionId, userId: params.playerId } },
      create: { sessionId: params.sessionId, userId: params.playerId, status: params.status },
      update: { status: params.status },
    });
    await syncPenaltyForAttendance(tx, {
      sessionId: params.sessionId,
      playerId: params.playerId,
      status: params.status,
      actorId: params.trainerId,
    });
  });
}

/** Kommende Trainings mit der eigenen Rückmeldung des Spielers. */
export function listUpcomingForPlayer(playerId: string) {
  return prisma.trainingSession.findMany({
    where: { startsAt: { gte: new Date() } },
    include: { attendances: { where: { userId: playerId } } },
    orderBy: { startsAt: "asc" },
  });
}

/** Alle Trainings für das Trainer-Dashboard, neueste zuerst, mit Anzahl der Rückmeldungen. */
export function listSessions() {
  return prisma.trainingSession.findMany({
    include: { attendances: true },
    orderBy: { startsAt: "desc" },
  });
}

/** Ein Training mit allen Spielern des Kaders und ihrem Status (auch ohne Rückmeldung). */
export async function getAttendanceList(sessionId: string) {
  const [session, players] = await Promise.all([
    prisma.trainingSession.findUniqueOrThrow({ where: { id: sessionId }, include: { attendances: true } }),
    prisma.user.findMany({ where: { role: "PLAYER" }, orderBy: { name: "asc" } }),
  ]);
  const byPlayer = new Map(session.attendances.map((a) => [a.userId, a]));
  return {
    session,
    rows: players.map((p) => ({ player: p, attendance: byPlayer.get(p.id) ?? null })),
  };
}
