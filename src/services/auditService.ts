/**
 * AuditService: protokolliert jede Änderung an Strafen und jede vom Trainer gesetzte Anwesenheit (REQ-AUD-01, MVP-6).
 * Es wird nur angelegt, nie geändert oder gelöscht (zusätzlich in der Datenbank per Trigger erzwungen).
 * Normale Spieler-Rückmeldungen (Dabei/Fehle/Unsicher) werden bewusst NICHT protokolliert (Entscheidung Team 03.11.).
 */
import type { AttendanceStatus, PenaltyStatus } from "@prisma/client";
import { prisma, type Tx } from "@/lib/db";

export type AuditAction =
  "VORGESCHLAGEN" | "FREIGEGEBEN" | "VERWORFEN" | "STORNIERT" | "TEILZAHLUNG" | "BEZAHLT" | "ANWESENHEIT_GESETZT";

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  VORGESCHLAGEN: "Strafe vorgeschlagen",
  FREIGEGEBEN: "Strafe freigegeben",
  VERWORFEN: "Vorschlag verworfen",
  STORNIERT: "Strafe storniert",
  TEILZAHLUNG: "Teilzahlung verbucht",
  BEZAHLT: "Bezahlt verbucht",
  ANWESENHEIT_GESETZT: "Anwesenheit gesetzt",
};

/** Protokolliert eine Statusänderung einer Strafe. */
export async function logPenaltyChange(
  tx: Tx,
  params: {
    entryId: string;
    actorId: string;
    action: AuditAction;
    oldStatus: PenaltyStatus | null;
    newStatus: PenaltyStatus;
    note?: string;
  },
) {
  await tx.auditLog.create({ data: params });
}

/** Protokolliert eine Anwesenheit, die der Trainer gesetzt oder geändert hat. */
export async function logAttendanceChange(
  tx: Tx,
  params: {
    attendanceId: string;
    actorId: string;
    oldAttendance: AttendanceStatus | null;
    newAttendance: AttendanceStatus;
  },
) {
  await tx.auditLog.create({ data: { ...params, action: "ANWESENHEIT_GESETZT" } });
}

/** Protokoll für Trainer und Kassenwart, neueste Einträge zuerst. */
export function listAuditLog(limit = 200) {
  return prisma.auditLog.findMany({
    include: {
      actor: true,
      entry: { include: { player: true, rule: true } },
      attendance: { include: { user: true, session: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
}
