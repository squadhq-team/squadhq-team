/**
 * StatsService: Beteiligungsquote je Mitglied (#30), bereinigt um Verletzungen.
 * Grundlage sind vergangene, nicht abgesagte Termine (optional nur ein Termin-Typ).
 */
import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { participationRate } from "@/domain/penalties";
import { listSquad } from "./teamService";

export async function getParticipation(teamId: string, type?: EventType) {
  const [squad, sessions] = await Promise.all([
    listSquad(teamId),
    prisma.trainingSession.findMany({
      where: { teamId, cancelledAt: null, startsAt: { lt: new Date() }, ...(type ? { type } : {}) },
      include: { attendances: true },
    }),
  ]);
  return squad
    .map((member) => {
      // Nur Termine ab dem Beitritt zählen (wer später dazukommt, wird nicht für alte Termine schlechter gestellt)
      const relevant = sessions.filter(
        (s) => s.startsAt >= member.createdAt || s.attendances.some((a) => a.userId === member.id),
      );
      const statuses = relevant.map((s) => s.attendances.find((a) => a.userId === member.id)?.status ?? null);
      return { member, ...participationRate(statuses) };
    })
    .sort((a, b) => (b.adjustedRate ?? -1) - (a.adjustedRate ?? -1) || a.member.name.localeCompare(b.member.name));
}
