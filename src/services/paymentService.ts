/**
 * PaymentService: Zahlungen verbuchen und Teamkasse für den Kassenwart (REQ-PEN-03 / MVP-4, REQ-PEN-04 / MVP-5).
 * Die Rechenregeln (Teilzahlung, überfällig) liegen in src/domain/penalties.ts, hier passiert nur die Persistenz.
 */
import { prisma } from "@/lib/db";
import { LATE_FEE_CENTS_PER_WEEK, applyPayment, balance, isOutstanding, isOverdue, openAmount, weeksOverdue, type PaymentMethod } from "@/domain/penalties";
import { formatEuro } from "@/lib/format";
import { logPenaltyChange } from "./auditService";

/**
 * Kassenwart verbucht eine Zahlung. Ohne Betrag wird der ganze offene Rest bezahlt (1-Klick: bar oder PayPal),
 * mit Betrag eine Teilzahlung. Strafe und Protokoll werden in einer Transaktion geschrieben.
 */
export async function recordPayment(params: { entryId: string; actorId: string; method: PaymentMethod; amountCents?: number }) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.penaltyEntry.findUniqueOrThrow({ where: { id: params.entryId } });
    const result = applyPayment(entry, params.method, params.amountCents);
    await tx.penaltyEntry.update({
      where: { id: entry.id },
      data: { status: result.status, paidCents: result.paidCents, method: params.method },
    });
    await logPenaltyChange(tx, {
      entryId: entry.id,
      actorId: params.actorId,
      action: result.status === "PARTIAL" ? "TEILZAHLUNG" : "BEZAHLT",
      oldStatus: entry.status,
      newStatus: result.status,
      note: `${formatEuro(result.bookedCents)} ${params.method === "CASH" ? "bar" : "per PayPal"}`,
    });
  });
}

/**
 * MVP-4 Teamkasse: alle freigegebenen Strafen (offen und bezahlt) mit Summen und Salden je Spieler.
 * Vorschläge (PENDING_APPROVAL) und stornierte Strafen zählen nicht zur Kasse.
 */
export async function getTeamCash(now: Date = new Date()) {
  const entries = await prisma.penaltyEntry.findMany({
    where: { status: { notIn: ["PENDING_APPROVAL", "CANCELLED"] } },
    include: { player: true, rule: true, session: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
  // Überfällig und Mahngebühr werden hier berechnet, damit die Seite keine Fachregeln kennen muss (Schichtenregel)
  const open = entries
    .filter((e) => isOutstanding(e.status))
    .map((e) => {
      const weeks = weeksOverdue(e, now);
      return { ...e, openCents: openAmount(e), overdue: isOverdue(e, now), weeksOverdue: weeks, lateFeeCents: weeks * LATE_FEE_CENTS_PER_WEEK };
    });
  const paid = entries.filter((e) => !isOutstanding(e.status)).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const perPlayer = new Map<string, { name: string; saldoCents: number }>();
  for (const e of open) {
    const p = perPlayer.get(e.playerId) ?? { name: e.player.name, saldoCents: 0 };
    p.saldoCents += e.openCents;
    perPlayer.set(e.playerId, p);
  }

  return {
    open,
    paid,
    openCents: balance(open),
    paidCents: entries.reduce((sum, e) => sum + e.paidCents, 0),
    overdueCount: open.filter((e) => e.overdue).length,
    balances: [...perPlayer.values()].sort((a, b) => b.saldoCents - a.saldoCents),
  };
}
