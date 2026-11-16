/**
 * StatsService: Zahlen für die Statistik-Seite.
 * - Beteiligungsquote je Mitglied (#30), bereinigt um Verletzungen; Grundlage sind vergangene, nicht abgesagte Termine
 * - Top-Strafen und Kassenverlauf (#65)
 * Die Leistungsbewertung liegt im RatingService, weil dort die Sichtbarkeit geprüft wird.
 */
import type { EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cashBalance, participationRate } from "@/domain/penalties";
import { cashHistory, centsFromPaymentNote, topPenalties } from "@/domain/statistics";
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

/**
 * #65 Top-Strafen: häufigste Katalogpositionen des Teams (nur freigegebene Strafen, ohne Mahngebühren und Beiträge).
 * Ohne Namen einzelner Spieler, deshalb für alle Mitglieder sichtbar.
 */
export async function getTopPenalties(teamId: string, limit = 5) {
  const entries = await prisma.penaltyEntry.findMany({
    where: { teamId, kind: "PENALTY", status: { notIn: ["PENDING_APPROVAL", "CANCELLED"] } },
    include: { rule: true },
  });
  return topPenalties(
    entries.map((e) => ({ ...e, ruleTitle: e.rule ? ruleLabel(e.rule) : "Ohne Katalogposition" })),
    limit,
  );
}

const ruleLabel = (r: { position: number | null; title: string }) =>
  r.position !== null ? `Pos. ${r.position} · ${r.title}` : r.title;

/**
 * #65 Kassenverlauf: Kassenstand nach jedem Tag mit Bewegung. Zahlungen kommen aus dem Protokoll (BEZAHLT, TEILZAHLUNG)
 * mit ihrem Buchungszeitpunkt, sonstige Einnahmen/Ausgaben aus dem Kassenbuch. Der letzte Punkt ist der Kassenstand
 * der Teamkasse (gleiche Regeln wie getTeamCash: Vorschläge und stornierte Forderungen zählen nicht).
 */
export async function getCashHistory(teamId: string) {
  const [payments, entries, transactions] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        teamId,
        action: { in: ["BEZAHLT", "TEILZAHLUNG"] },
        entry: { status: { notIn: ["PENDING_APPROVAL", "CANCELLED"] } },
      },
      select: { createdAt: true, amountCents: true, note: true },
    }),
    prisma.penaltyEntry.findMany({
      where: { teamId, status: { notIn: ["PENDING_APPROVAL", "CANCELLED"] } },
      select: { paidCents: true },
    }),
    prisma.cashTransaction.findMany({ where: { teamId } }),
  ]);
  const paidCents = entries.reduce((s, e) => s + e.paidCents, 0);
  const { balanceCents, incomeCents, expenseCents } = cashBalance(paidCents, transactions);
  const movements = [
    ...payments.flatMap((p) => {
      const cents = p.amountCents ?? centsFromPaymentNote(p.note);
      return cents ? [{ at: p.createdAt, cents }] : [];
    }),
    ...transactions
      .filter((t) => !t.cancelledAt)
      .map((t) => ({ at: t.bookedAt, cents: t.direction === "INCOME" ? t.amountCents : -t.amountCents })),
  ];
  return { balanceCents, inCents: paidCents + incomeCents, expenseCents, ...cashHistory(movements, balanceCents) };
}
