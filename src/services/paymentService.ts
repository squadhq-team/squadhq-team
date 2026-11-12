/**
 * PaymentService: Zahlungen verbuchen und Teamkasse (REQ-PEN-03 / MVP-4, REQ-PEN-04 / MVP-5),
 * automatische Mahngebühr (#52), Beiträge, Einnahmen/Ausgaben (#53) und PayPal-Link (#54).
 * Die Rechenregeln liegen in src/domain/penalties.ts, hier passiert nur die Persistenz.
 */
import type { CashDirection } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  LATE_FEE_CENTS_PER_WEEK,
  applyPayment,
  balance,
  cashBalance,
  dueDateFrom,
  isOutstanding,
  isOverdue,
  missingLateFeeWeeks,
  normalizePaypalMe,
  openAmount,
  paypalMeUrl,
  type PaymentMethod,
} from "@/domain/penalties";
import { SQUAD_ROLES } from "@/domain/permissions";
import { formatEuro } from "@/lib/format";
import { logPenaltyChange, logTransaction } from "./auditService";

/**
 * Kassenwart verbucht eine Zahlung. Ohne Betrag wird der ganze offene Rest bezahlt (1-Klick: bar oder PayPal),
 * mit Betrag eine Teilzahlung. Forderung und Protokoll werden in einer Transaktion geschrieben.
 */
export async function recordPayment(params: {
  teamId: string;
  entryId: string;
  actorId: string;
  method: PaymentMethod;
  amountCents?: number;
}) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.penaltyEntry.findFirst({ where: { id: params.entryId, teamId: params.teamId } });
    if (!entry) throw new Error("Diese Forderung gibt es in deinem Team nicht.");
    const result = applyPayment(entry, params.method, params.amountCents);
    await tx.penaltyEntry.update({
      where: { id: entry.id },
      data: { status: result.status, paidCents: result.paidCents, method: params.method },
    });
    await logPenaltyChange(tx, {
      teamId: params.teamId,
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
 * #52: Mahngebühr automatisch buchen. Für jede angefangene Woche nach der Frist entsteht genau eine Mahngebühr
 * (Betrag aus der Katalogregel „Zahlungsverzug“, Standard 5 €), offen und im Protokoll als „automatisch“.
 * Erlassene Gebühren kommen nicht wieder. Läuft beim Öffnen von Kasse, Kassenkonto und Startseite; doppelte Buchungen
 * verhindert die Datenbank (eindeutig je Strafe und Woche).
 */
export async function applyLateFees(teamId: string, now: Date = new Date()) {
  const rule = await prisma.penaltyRule.findFirst({ where: { teamId, trigger: "LATE_FEE" } });
  if (rule && !rule.active) return 0;
  const overdue = await prisma.penaltyEntry.findMany({
    where: { teamId, kind: "PENALTY", status: { in: ["OPEN", "PARTIAL"] }, dueDate: { lt: now } },
    include: { lateFees: { select: { lateFeeWeek: true } } },
  });
  let created = 0;
  for (const entry of overdue) {
    const weeks = missingLateFeeWeeks(
      entry,
      entry.lateFees.map((f) => f.lateFeeWeek ?? 0),
      now,
    );
    for (const week of weeks) {
      try {
        await prisma.$transaction(async (tx) => {
          const fee = await tx.penaltyEntry.create({
            data: {
              teamId,
              kind: "LATE_FEE",
              playerId: entry.playerId,
              ruleId: rule?.id ?? null,
              sessionId: entry.sessionId,
              parentId: entry.id,
              lateFeeWeek: week,
              title: `Mahngebühr ${week}. Woche`,
              amountCents: rule?.amountCents ?? LATE_FEE_CENTS_PER_WEEK,
              status: "OPEN",
              dueDate: dueDateFrom(new Date(entry.dueDate!.getTime() + (week - 1) * 7 * 86_400_000)),
            },
          });
          await logPenaltyChange(tx, {
            teamId,
            entryId: fee.id,
            actorId: null,
            action: "MAHNGEBUEHR",
            oldStatus: null,
            newStatus: "OPEN",
            note: `${week}. Woche Verzug`,
          });
        });
        created++;
      } catch (e) {
        // Gleichzeitiger Aufruf hat diese Woche schon gebucht (eindeutiger Schlüssel): nichts zu tun
        if (!(e instanceof Error && /Unique constraint/i.test(e.message))) throw e;
      }
    }
  }
  return created;
}

/**
 * MVP-4 Teamkasse: alle freigegebenen Forderungen (offen und bezahlt) mit Summen, Salden je Mitglied und Kassenbuch.
 * Vorschläge (PENDING_APPROVAL) und stornierte Forderungen zählen nicht zur Kasse.
 */
export async function getTeamCash(teamId: string, now: Date = new Date()) {
  await applyLateFees(teamId, now);
  const [entries, transactions] = await Promise.all([
    prisma.penaltyEntry.findMany({
      where: { teamId, status: { notIn: ["PENDING_APPROVAL", "CANCELLED"] } },
      include: { player: true, rule: true, session: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.cashTransaction.findMany({
      where: { teamId },
      include: { createdBy: true },
      orderBy: [{ bookedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const open = entries
    .filter((e) => isOutstanding(e.status))
    .map((e) => ({ ...e, openCents: openAmount(e), overdue: isOverdue(e, now) }));
  const paid = entries
    .filter((e) => !isOutstanding(e.status))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const perPlayer = new Map<string, { id: string; name: string; saldoCents: number }>();
  for (const e of open) {
    const p = perPlayer.get(e.playerId) ?? { id: e.playerId, name: e.player.name, saldoCents: 0 };
    p.saldoCents += e.openCents;
    perPlayer.set(e.playerId, p);
  }
  const paidCents = entries.reduce((sum, e) => sum + e.paidCents, 0);

  return {
    open,
    paid,
    openCents: balance(open),
    paidCents,
    overdueCount: open.filter((e) => e.overdue).length,
    balances: [...perPlayer.values()].sort((a, b) => b.saldoCents - a.saldoCents),
    transactions,
    ...cashBalance(paidCents, transactions),
  };
}

/** #53: Einnahme oder Ausgabe ins Kassenbuch eintragen (z. B. Getränke, Mannschaftsfeier, Sponsor). */
export async function addTransaction(params: {
  teamId: string;
  actorId: string;
  direction: CashDirection;
  amountCents: number;
  description: string;
  bookedAt?: Date;
}) {
  if (params.direction !== "INCOME" && params.direction !== "EXPENSE")
    throw new Error("Bitte Einnahme oder Ausgabe wählen.");
  if (!Number.isInteger(params.amountCents) || params.amountCents <= 0 || params.amountCents > 10_000_000)
    throw new Error("Bitte einen Betrag größer als 0 eingeben.");
  if (params.description.trim().length < 2) throw new Error("Bitte kurz beschreiben, wofür.");
  const bookedAt = params.bookedAt && !Number.isNaN(params.bookedAt.getTime()) ? params.bookedAt : new Date();
  return prisma.$transaction(async (tx) => {
    const t = await tx.cashTransaction.create({
      data: {
        teamId: params.teamId,
        direction: params.direction,
        amountCents: params.amountCents,
        description: params.description.trim(),
        bookedAt,
        createdById: params.actorId,
      },
    });
    await logTransaction(tx, {
      teamId: params.teamId,
      transactionId: t.id,
      actorId: params.actorId,
      action: params.direction === "INCOME" ? "EINNAHME" : "AUSGABE",
      note: `${formatEuro(params.amountCents)} · ${t.description}`,
    });
    return t;
  });
}

/** Buchung stornieren statt löschen (Protokoll bleibt vollständig). */
export async function cancelTransaction(params: { teamId: string; actorId: string; transactionId: string }) {
  await prisma.$transaction(async (tx) => {
    const t = await tx.cashTransaction.findFirst({ where: { id: params.transactionId, teamId: params.teamId } });
    if (!t) throw new Error("Diese Buchung gibt es in deinem Team nicht.");
    if (t.cancelledAt) throw new Error("Diese Buchung ist schon storniert.");
    await tx.cashTransaction.update({ where: { id: t.id }, data: { cancelledAt: new Date() } });
    await logTransaction(tx, {
      teamId: params.teamId,
      transactionId: t.id,
      actorId: params.actorId,
      action: "BUCHUNG_STORNIERT",
      note: `${formatEuro(t.amountCents)} · ${t.description}`,
    });
  });
}

/**
 * Beiträge (Beitragsverwaltung): Kassenwart legt einen Beitrag für ausgewählte Mitglieder des Kaders an,
 * z. B. „Saisonbeitrag 2026/27“ 50 €. Er erscheint im Kassenkonto und wird wie eine Strafe bezahlt.
 */
export async function createFees(params: {
  teamId: string;
  actorId: string;
  title: string;
  amountCents: number;
  playerIds: string[];
  dueDate?: Date;
}) {
  if (params.title.trim().length < 3) throw new Error("Bitte eine Bezeichnung angeben, z. B. Saisonbeitrag.");
  if (!Number.isInteger(params.amountCents) || params.amountCents <= 0)
    throw new Error("Bitte einen Betrag größer als 0 eingeben.");
  const players = await prisma.user.findMany({
    where: { id: { in: params.playerIds }, teamId: params.teamId, deletedAt: null, role: { in: SQUAD_ROLES } },
  });
  if (players.length === 0) throw new Error("Bitte mindestens ein Mitglied auswählen.");
  const dueDate = params.dueDate && !Number.isNaN(params.dueDate.getTime()) ? params.dueDate : dueDateFrom(new Date());
  await prisma.$transaction(async (tx) => {
    for (const p of players) {
      const entry = await tx.penaltyEntry.create({
        data: {
          teamId: params.teamId,
          kind: "FEE",
          playerId: p.id,
          title: params.title.trim(),
          amountCents: params.amountCents,
          status: "OPEN",
          dueDate,
          createdById: params.actorId,
        },
      });
      await logPenaltyChange(tx, {
        teamId: params.teamId,
        entryId: entry.id,
        actorId: params.actorId,
        action: "BEITRAG",
        oldStatus: null,
        newStatus: "OPEN",
        note: `${params.title.trim()} ${formatEuro(params.amountCents)}`,
      });
    }
  });
  return players.length;
}

/** #54: PayPal.me-Namen des Kassenwarts speichern (leer = entfernen). Steht nur in der Datenbank. */
export async function setPaypalMe(teamId: string, input: string) {
  const value = input.trim();
  if (!value) return prisma.team.update({ where: { id: teamId }, data: { paypalMe: null } });
  const name = normalizePaypalMe(value);
  if (!name) throw new Error("Bitte deinen PayPal.me-Namen eingeben, z. B. paypal.me/kalle123 oder kalle123.");
  return prisma.team.update({ where: { id: teamId }, data: { paypalMe: name } });
}

/** #54: Link „Per PayPal zahlen“ für einen offenen Betrag, oder null ohne hinterlegten PayPal.me-Namen. */
export function paypalLinkFor(team: { paypalMe: string | null }, cents: number): string | null {
  return team.paypalMe && cents > 0 ? paypalMeUrl(team.paypalMe, cents) : null;
}
