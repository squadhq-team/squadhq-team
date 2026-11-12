/**
 * AuditService: protokolliert jede Änderung an Forderungen (Strafen, Mahngebühren, Beiträge), jede vom Trainer gesetzte
 * Anwesenheit, jede Kassenbuchung und jeden Rollenwechsel (REQ-AUD-01, MVP-6).
 * Es wird nur angelegt, nie geändert oder gelöscht (zusätzlich in der Datenbank per Trigger erzwungen).
 * Normale Spieler-Rückmeldungen (Dabei/Fehle/Unsicher) werden bewusst NICHT protokolliert (Entscheidung Team 03.11.).
 */
import type { AttendanceStatus, PenaltyStatus } from "@prisma/client";
import { prisma, type Tx } from "@/lib/db";

export type AuditAction =
  | "VORGESCHLAGEN"
  | "MANUELL_VERGEBEN"
  | "FREIGEGEBEN"
  | "VERWORFEN"
  | "STORNIERT"
  | "TEILZAHLUNG"
  | "BEZAHLT"
  | "MAHNGEBUEHR"
  | "ERLASSEN"
  | "BEITRAG"
  | "ANWESENHEIT_GESETZT"
  | "EINNAHME"
  | "AUSGABE"
  | "BUCHUNG_STORNIERT"
  | "BEIGETRETEN"
  | "ROLLE_GEAENDERT"
  | "MITGLIED_ENTFERNT"
  | "KONTO_GELOESCHT";

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  VORGESCHLAGEN: "Strafe vorgeschlagen",
  MANUELL_VERGEBEN: "Strafe vergeben",
  FREIGEGEBEN: "Strafe freigegeben",
  VERWORFEN: "Vorschlag verworfen",
  STORNIERT: "Strafe storniert",
  TEILZAHLUNG: "Teilzahlung verbucht",
  BEZAHLT: "Bezahlt verbucht",
  MAHNGEBUEHR: "Mahngebühr gebucht",
  ERLASSEN: "Mahngebühr erlassen",
  BEITRAG: "Beitrag angelegt",
  ANWESENHEIT_GESETZT: "Anwesenheit gesetzt",
  EINNAHME: "Einnahme gebucht",
  AUSGABE: "Ausgabe gebucht",
  BUCHUNG_STORNIERT: "Buchung storniert",
  BEIGETRETEN: "Dem Team beigetreten",
  ROLLE_GEAENDERT: "Rolle geändert",
  MITGLIED_ENTFERNT: "Aus dem Team entfernt",
  KONTO_GELOESCHT: "Konto gelöscht",
};

/** Protokolliert eine Statusänderung einer Forderung. actorId null = automatisch (System). */
export async function logPenaltyChange(
  tx: Tx,
  params: {
    teamId: string;
    entryId: string;
    actorId: string | null;
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
    teamId: string;
    attendanceId: string;
    actorId: string;
    oldAttendance: AttendanceStatus | null;
    newAttendance: AttendanceStatus;
  },
) {
  await tx.auditLog.create({ data: { ...params, action: "ANWESENHEIT_GESETZT" } });
}

/** Protokolliert eine Kassenbuchung (Einnahme, Ausgabe, Storno). */
export async function logTransaction(
  tx: Tx,
  params: { teamId: string; transactionId: string; actorId: string; action: AuditAction; note?: string },
) {
  await tx.auditLog.create({ data: params });
}

/** Protokolliert eine Änderung an einem Mitglied (Beitritt, Rolle, Entfernen, Konto gelöscht). */
export async function logMemberChange(
  tx: Tx,
  params: { teamId: string; subjectId: string; actorId: string | null; action: AuditAction; note?: string },
) {
  await tx.auditLog.create({ data: params });
}

/** Protokoll eines Teams für Trainer und Kassenwart, neueste Einträge zuerst. */
export function listAuditLog(teamId: string, limit = 300) {
  return prisma.auditLog.findMany({
    where: { teamId },
    include: {
      actor: true,
      subject: true,
      transaction: true,
      entry: { include: { player: true, rule: true } },
      attendance: { include: { user: true, session: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
}
