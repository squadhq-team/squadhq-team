/**
 * Zugriffsschutz für Supabase (seit dem Umstieg auf Supabase Auth, 10.11.2026).
 * Supabase stellt alle Tabellen im Schema "public" zusätzlich über seine REST-Schnittstelle bereit.
 * Wer den (öffentlichen) Anon-Key kennt, könnte darüber sonst Tabellen lesen oder ändern.
 * Row Level Security ohne Freigabe-Regeln sperrt diesen Weg komplett. Die App selbst ist nicht betroffen:
 * Prisma verbindet sich als Eigentümer der Tabellen, und für den gilt RLS nicht.
 *
 * Wird wie der Audit-Log-Schutz mit `npm run db:audit-schutz` eingespielt (in `npm run db:reset` enthalten). Idempotent.
 */
import type { PrismaClient } from "@prisma/client";

export const APP_TABLES = [
  "Team",
  "User",
  "TrainingSession",
  "Attendance",
  "PenaltyRule",
  "PenaltyEntry",
  "CashTransaction",
  "AuditLog",
  "Announcement",
  "Poll",
  "PollOption",
  "PollVote",
  "ChatMessage",
  "PushSubscription",
] as const;

export const ZUGRIFFSSCHUTZ_SQL: string[] = APP_TABLES.map((t) => `ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY`);

export async function applyZugriffsschutz(prisma: PrismaClient) {
  for (const sql of ZUGRIFFSSCHUTZ_SQL) await prisma.$executeRawUnsafe(sql);
}
