/**
 * PenaltyEngine: Regelprüfung gegen den TSVK-Katalog und Lebenszyklus von Strafvorschlägen (REQ-PEN-02).
 * Fachregeln selbst liegen in src/domain/penalties.ts, hier passiert nur die Persistenz.
 */
import type { AttendanceStatus } from "@prisma/client";
import { prisma, type Tx } from "@/lib/db";
import { dueDateFrom, suggestRuleForAttendance } from "@/domain/penalties";
import { logPenaltyChange } from "./auditService";

/**
 * Gleicht die Strafe eines Spielers zu einem Training mit seinem Anwesenheitsstatus ab.
 * - UNEXCUSED: legt einen Vorschlag (PENDING_APPROVAL) an, falls noch keiner existiert (Akzeptanzkriterium 1)
 * - jeder andere Status: verwirft einen offenen Vorschlag bzw. storniert eine freigegebene, unbezahlte Strafe (Akzeptanzkriterium 3)
 */
export async function syncPenaltyForAttendance(
  tx: Tx,
  params: { sessionId: string; playerId: string; status: AttendanceStatus; actorId: string },
) {
  const rules = await tx.penaltyRule.findMany({ where: { trigger: "UNEXCUSED_ABSENCE" } });
  const rule = suggestRuleForAttendance("UNEXCUSED", rules);
  if (!rule) return;

  const existing = await tx.penaltyEntry.findFirst({
    where: {
      sessionId: params.sessionId,
      playerId: params.playerId,
      ruleId: rule.id,
      status: { in: ["PENDING_APPROVAL", "OPEN", "PARTIAL"] },
    },
  });

  if (params.status === "UNEXCUSED") {
    if (existing) return;
    const entry = await tx.penaltyEntry.create({
      data: {
        playerId: params.playerId,
        sessionId: params.sessionId,
        ruleId: rule.id,
        amountCents: rule.amountCents,
        status: "PENDING_APPROVAL",
        createdById: params.actorId,
      },
    });
    await logPenaltyChange(tx, { entryId: entry.id, actorId: params.actorId, action: "VORGESCHLAGEN", oldStatus: null, newStatus: "PENDING_APPROVAL" });
    return;
  }

  if (!existing) return;
  const action = existing.status === "PENDING_APPROVAL" ? "VERWORFEN" : "STORNIERT";
  await tx.penaltyEntry.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
  await logPenaltyChange(tx, {
    entryId: existing.id,
    actorId: params.actorId,
    action,
    oldStatus: existing.status,
    newStatus: "CANCELLED",
    note: "Anwesenheitsstatus geändert",
  });
}

/** Trainer gibt einen Vorschlag frei: Status OPEN, Fälligkeit gesetzt, zählt ab jetzt im Saldo (Akzeptanzkriterium 2). */
export async function approvePenalty(entryId: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.penaltyEntry.findUniqueOrThrow({ where: { id: entryId } });
    if (entry.status !== "PENDING_APPROVAL") throw new Error("Diese Strafe wartet nicht auf Freigabe.");
    const now = new Date();
    await tx.penaltyEntry.update({ where: { id: entryId }, data: { status: "OPEN", dueDate: dueDateFrom(now) } });
    await logPenaltyChange(tx, { entryId, actorId, action: "FREIGEGEBEN", oldStatus: entry.status, newStatus: "OPEN" });
  });
}

/** Trainer verwirft einen Vorschlag, z. B. weil die Entschuldigung nachgereicht wurde. */
export async function discardPenalty(entryId: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.penaltyEntry.findUniqueOrThrow({ where: { id: entryId } });
    if (entry.status !== "PENDING_APPROVAL") throw new Error("Diese Strafe wartet nicht auf Freigabe.");
    await tx.penaltyEntry.update({ where: { id: entryId }, data: { status: "CANCELLED" } });
    await logPenaltyChange(tx, { entryId, actorId, action: "VERWORFEN", oldStatus: entry.status, newStatus: "CANCELLED" });
  });
}

/** Alle Strafen eines Spielers, neueste zuerst, für das Kassenkonto. */
export function listPenaltiesForPlayer(playerId: string) {
  return prisma.penaltyEntry.findMany({
    where: { playerId },
    include: { rule: true, session: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Offene Vorschläge eines Trainings für die Freigabe im Trainer-Dashboard. */
export function listPendingForSession(sessionId: string) {
  return prisma.penaltyEntry.findMany({
    where: { sessionId, status: "PENDING_APPROVAL" },
    include: { player: true, rule: true },
    orderBy: { createdAt: "asc" },
  });
}
