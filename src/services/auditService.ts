/**
 * AuditService: protokolliert jede Statusänderung einer Strafe (Feedback Kassenwart).
 * Es wird nur angelegt, nie geändert oder gelöscht.
 */
import type { PenaltyStatus } from "@prisma/client";
import type { Tx } from "@/lib/db";

export type AuditAction = "VORGESCHLAGEN" | "FREIGEGEBEN" | "VERWORFEN" | "STORNIERT";

export async function logPenaltyChange(
  tx: Tx,
  params: { entryId: string; actorId: string; action: AuditAction; oldStatus: PenaltyStatus | null; newStatus: PenaltyStatus; note?: string },
) {
  await tx.auditLog.create({ data: params });
}
