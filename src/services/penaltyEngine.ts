/**
 * PenaltyEngine: Regelprüfung gegen den Strafenkatalog des Teams und Lebenszyklus von Strafen (REQ-PEN-01/02, #46, #47).
 * Fachregeln selbst liegen in src/domain/penalties.ts, hier passiert nur die Persistenz.
 */
import type { AttendanceStatus, EventType } from "@prisma/client";
import { prisma, type Tx } from "@/lib/db";
import {
  absenceTriggerFor,
  balance,
  dueDateFrom,
  manualPenaltyAmount,
  suggestRuleForAttendance,
} from "@/domain/penalties";
import { SQUAD_ROLES } from "@/domain/permissions";
import { logPenaltyChange } from "./auditService";
import { applyLateFees } from "./paymentService";

/**
 * Gleicht die Strafe eines Spielers zu einem Termin mit seinem Anwesenheitsstatus ab.
 * - UNEXCUSED: legt einen Vorschlag (PENDING_APPROVAL) an, falls noch keiner existiert (Akzeptanzkriterium 1);
 *   Training → Pos. 8 (20 €), Spiel/Turnier → Pos. 9 (40 €), Feier/Sonstiges → keine Strafe
 * - jeder andere Status: verwirft einen offenen Vorschlag bzw. storniert eine freigegebene, unbezahlte Strafe (Akzeptanzkriterium 3)
 */
export async function syncPenaltyForAttendance(
  tx: Tx,
  params: {
    teamId: string;
    sessionId: string;
    eventType: EventType;
    playerId: string;
    status: AttendanceStatus;
    actorId: string;
  },
) {
  const trigger = absenceTriggerFor(params.eventType);
  if (!trigger) return;
  const rules = await tx.penaltyRule.findMany({ where: { teamId: params.teamId, trigger } });
  const rule = suggestRuleForAttendance("UNEXCUSED", rules, params.eventType);

  const existing = await tx.penaltyEntry.findFirst({
    where: {
      sessionId: params.sessionId,
      playerId: params.playerId,
      kind: "PENALTY",
      rule: { trigger },
      status: { in: ["PENDING_APPROVAL", "OPEN", "PARTIAL"] },
    },
  });

  if (params.status === "UNEXCUSED") {
    if (existing || !rule) return;
    const entry = await tx.penaltyEntry.create({
      data: {
        teamId: params.teamId,
        playerId: params.playerId,
        sessionId: params.sessionId,
        ruleId: rule.id,
        amountCents: rule.amountCents,
        status: "PENDING_APPROVAL",
        createdById: params.actorId,
      },
    });
    await logPenaltyChange(tx, {
      teamId: params.teamId,
      entryId: entry.id,
      actorId: params.actorId,
      action: "VORGESCHLAGEN",
      oldStatus: null,
      newStatus: "PENDING_APPROVAL",
    });
    return;
  }

  if (!existing || existing.status === "PARTIAL") return; // Teilzahlung schon geleistet: bleibt, Kassenwart klärt
  const action = existing.status === "PENDING_APPROVAL" ? "VERWORFEN" : "STORNIERT";
  await tx.penaltyEntry.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
  await logPenaltyChange(tx, {
    teamId: params.teamId,
    entryId: existing.id,
    actorId: params.actorId,
    action,
    oldStatus: existing.status,
    newStatus: "CANCELLED",
    note: "Anwesenheitsstatus geändert",
  });
  await cancelOpenLateFees(tx, params.teamId, existing.id, params.actorId);
}

/** Wird eine Strafe storniert, entfallen auch ihre noch offenen Mahngebühren (mit Protokolleintrag). */
async function cancelOpenLateFees(tx: Tx, teamId: string, parentId: string, actorId: string) {
  const fees = await tx.penaltyEntry.findMany({ where: { teamId, parentId, status: "OPEN" } });
  for (const fee of fees) {
    await tx.penaltyEntry.update({ where: { id: fee.id }, data: { status: "CANCELLED" } });
    await logPenaltyChange(tx, {
      teamId,
      entryId: fee.id,
      actorId,
      action: "ERLASSEN",
      oldStatus: "OPEN",
      newStatus: "CANCELLED",
      note: "Strafe storniert",
    });
  }
}

/**
 * #46: Strafe aus dem Katalog per Hand vergeben (Verspätung, Karten, Ausrüstung …).
 * Vom Trainer: sofort offen (er ist die Freigabe-Stufe). Von Betreuer oder Kassenwart: Vorschlag, den der Trainer freigibt.
 */
export async function createManualPenalty(params: {
  teamId: string;
  actorId: string;
  directlyOpen: boolean;
  playerId: string;
  ruleId: string;
  quantity: number;
  sessionId?: string;
  note?: string;
}) {
  const [rule, player] = await Promise.all([
    prisma.penaltyRule.findFirst({ where: { id: params.ruleId, teamId: params.teamId } }),
    prisma.user.findFirst({
      where: { id: params.playerId, teamId: params.teamId, deletedAt: null, role: { in: SQUAD_ROLES } },
    }),
  ]);
  if (!rule) throw new Error("Bitte eine Position aus dem Katalog wählen.");
  if (!player) throw new Error("Bitte ein Mitglied aus dem Kader wählen.");
  if (params.sessionId) {
    const session = await prisma.trainingSession.findFirst({ where: { id: params.sessionId, teamId: params.teamId } });
    if (!session) throw new Error("Diesen Termin gibt es in deinem Team nicht.");
  }
  const amountCents = manualPenaltyAmount(rule, params.quantity);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const entry = await tx.penaltyEntry.create({
      data: {
        teamId: params.teamId,
        playerId: player.id,
        ruleId: rule.id,
        sessionId: params.sessionId || null,
        quantity: params.quantity,
        note: params.note?.trim() || null,
        amountCents,
        status: params.directlyOpen ? "OPEN" : "PENDING_APPROVAL",
        dueDate: params.directlyOpen ? dueDateFrom(now) : null,
        createdById: params.actorId,
      },
    });
    await logPenaltyChange(tx, {
      teamId: params.teamId,
      entryId: entry.id,
      actorId: params.actorId,
      action: params.directlyOpen ? "MANUELL_VERGEBEN" : "VORGESCHLAGEN",
      oldStatus: null,
      newStatus: entry.status,
      note: params.quantity > 1 ? `${params.quantity} Stück` : undefined,
    });
    return entry;
  });
}

/** Forderung des eigenen Teams laden oder Fehler werfen. */
async function getEntry(tx: Tx, teamId: string, entryId: string) {
  const entry = await tx.penaltyEntry.findFirst({ where: { id: entryId, teamId } });
  if (!entry) throw new Error("Diese Strafe gibt es in deinem Team nicht.");
  return entry;
}

/** Trainer gibt einen Vorschlag frei: Status OPEN, Fälligkeit gesetzt, zählt ab jetzt im Saldo (Akzeptanzkriterium 2). */
export async function approvePenalty(teamId: string, entryId: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const entry = await getEntry(tx, teamId, entryId);
    if (entry.status !== "PENDING_APPROVAL") throw new Error("Diese Strafe wartet nicht auf Freigabe.");
    await tx.penaltyEntry.update({
      where: { id: entryId },
      data: { status: "OPEN", dueDate: dueDateFrom(new Date()) },
    });
    await logPenaltyChange(tx, {
      teamId,
      entryId,
      actorId,
      action: "FREIGEGEBEN",
      oldStatus: entry.status,
      newStatus: "OPEN",
    });
  });
}

/** Trainer verwirft einen Vorschlag, z. B. weil die Entschuldigung nachgereicht wurde. */
export async function discardPenalty(teamId: string, entryId: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const entry = await getEntry(tx, teamId, entryId);
    if (entry.status !== "PENDING_APPROVAL") throw new Error("Diese Strafe wartet nicht auf Freigabe.");
    await tx.penaltyEntry.update({ where: { id: entryId }, data: { status: "CANCELLED" } });
    await logPenaltyChange(tx, {
      teamId,
      entryId,
      actorId,
      action: "VERWORFEN",
      oldStatus: entry.status,
      newStatus: "CANCELLED",
    });
  });
}

/** Trainer storniert eine freigegebene, noch nicht (teilweise) bezahlte Strafe, z. B. bei einem Irrtum. */
export async function cancelPenalty(teamId: string, entryId: string, actorId: string, note?: string) {
  await prisma.$transaction(async (tx) => {
    const entry = await getEntry(tx, teamId, entryId);
    if (entry.status !== "OPEN") throw new Error("Nur offene, noch nicht bezahlte Strafen lassen sich stornieren.");
    await tx.penaltyEntry.update({ where: { id: entryId }, data: { status: "CANCELLED" } });
    await logPenaltyChange(tx, {
      teamId,
      entryId,
      actorId,
      action: entry.kind === "LATE_FEE" ? "ERLASSEN" : "STORNIERT",
      oldStatus: entry.status,
      newStatus: "CANCELLED",
      note: note?.trim() || undefined,
    });
    await cancelOpenLateFees(tx, teamId, entryId, actorId);
  });
}

/** Alle Forderungen eines Mitglieds, neueste zuerst. */
export function listPenaltiesForPlayer(teamId: string, playerId: string) {
  return prisma.penaltyEntry.findMany({
    where: { teamId, playerId },
    include: { rule: true, session: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * REQ-PEN-03: Kassenkonto eines Mitglieds.
 * Sichtbar sind nur freigegebene Forderungen (keine Vorschläge, keine stornierten); der Saldo zählt nur OPEN und PARTIAL.
 */
export async function getPlayerAccount(teamId: string, playerId: string) {
  await applyLateFees(teamId);
  const entries = await listPenaltiesForPlayer(teamId, playerId);
  return {
    saldoCents: balance(entries),
    entries: entries.filter((p) => p.status !== "PENDING_APPROVAL" && p.status !== "CANCELLED"),
  };
}

/** Offene Vorschläge eines Termins für die Freigabe. */
export function listPendingForSession(teamId: string, sessionId: string) {
  return prisma.penaltyEntry.findMany({
    where: { teamId, sessionId, status: "PENDING_APPROVAL" },
    include: { player: true, rule: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Alle offenen Vorschläge des Teams (auch manuelle von Betreuer/Kassenwart) für den Trainer. */
export function listPendingForTeam(teamId: string) {
  return prisma.penaltyEntry.findMany({
    where: { teamId, status: "PENDING_APPROVAL" },
    include: { player: true, rule: true, session: true, createdBy: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Strafenkatalog des Teams: aktive Regeln zuerst, dann nach Position. */
export function listRules(teamId: string) {
  return prisma.penaltyRule.findMany({
    where: { teamId },
    orderBy: [{ active: "desc" }, { position: { sort: "asc", nulls: "last" } }, { title: "asc" }],
  });
}

/** Katalog pflegen: Betrag, Titel und aktiv/inaktiv einer Regel ändern. Gilt nur für neue Strafen. */
export async function updateRule(params: {
  teamId: string;
  ruleId: string;
  title: string;
  amountCents: number;
  active: boolean;
}) {
  const rule = await prisma.penaltyRule.findFirst({ where: { id: params.ruleId, teamId: params.teamId } });
  if (!rule) throw new Error("Diese Regel gibt es in deinem Katalog nicht.");
  if (params.title.trim().length < 3) throw new Error("Bitte eine Bezeichnung angeben.");
  if (!Number.isInteger(params.amountCents) || params.amountCents < 0 || params.amountCents > 100_000)
    throw new Error("Bitte einen Betrag zwischen 0 und 1.000 € angeben.");
  return prisma.penaltyRule.update({
    where: { id: rule.id },
    data: { title: params.title.trim(), amountCents: params.amountCents, active: params.active },
  });
}

/** Katalog pflegen: eigene Regel ergänzen (manuell zu vergeben). */
export async function addRule(params: { teamId: string; title: string; amountCents: number }) {
  if (params.title.trim().length < 3) throw new Error("Bitte eine Bezeichnung angeben.");
  if (!Number.isInteger(params.amountCents) || params.amountCents <= 0 || params.amountCents > 100_000)
    throw new Error("Bitte einen Betrag zwischen 0,01 und 1.000 € angeben.");
  return prisma.penaltyRule.create({
    data: { teamId: params.teamId, title: params.title.trim(), amountCents: params.amountCents, trigger: "MANUAL" },
  });
}
