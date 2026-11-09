/**
 * REQ-AUD-01 (MVP-6): macht das Audit-Log in PostgreSQL manipulationssicher.
 * Einträge lassen sich nur anlegen. UPDATE, DELETE und TRUNCATE auf "AuditLog" lehnt die Datenbank ab,
 * egal ob der Zugriff aus der App, aus einem Skript oder direkt per SQL kommt.
 * Zusammen mit `onDelete: Restrict` im Schema kann damit auch keine Strafe samt Protokoll gelöscht werden.
 *
 * `prisma db push` kennt keine Trigger, deshalb wird dieser Schutz nach jedem `db push` mit
 * `npm run db:audit-schutz` eingespielt (in `npm run db:reset` schon enthalten). Die Anweisungen sind idempotent.
 */
import type { PrismaClient } from "@prisma/client";

export const AUDIT_LOG_SCHUTZ_SQL: string[] = [
  `CREATE OR REPLACE FUNCTION audit_log_nur_anlegen() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog ist unveränderlich: % ist nicht erlaubt', TG_OP;
END;
$$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS audit_log_kein_aendern_loeschen ON "AuditLog"`,
  `CREATE TRIGGER audit_log_kein_aendern_loeschen BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION audit_log_nur_anlegen()`,
  `DROP TRIGGER IF EXISTS audit_log_kein_leeren ON "AuditLog"`,
  `CREATE TRIGGER audit_log_kein_leeren BEFORE TRUNCATE ON "AuditLog" FOR EACH STATEMENT EXECUTE FUNCTION audit_log_nur_anlegen()`,
  // Jeder Eintrag betrifft genau eine Sache: eine Strafe oder eine Anwesenheit
  `ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS audit_log_genau_ein_bezug`,
  `ALTER TABLE "AuditLog" ADD CONSTRAINT audit_log_genau_ein_bezug CHECK (num_nonnulls("entryId", "attendanceId") = 1)`,
];

export async function applyAuditLogSchutz(prisma: PrismaClient) {
  for (const sql of AUDIT_LOG_SCHUTZ_SQL) await prisma.$executeRawUnsafe(sql);
}
