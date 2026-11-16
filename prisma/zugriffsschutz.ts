/**
 * Zugriffsschutz für Supabase (seit dem Umstieg auf Supabase Auth, 10.11.2026).
 * Supabase stellt alle Tabellen im Schema "public" zusätzlich über seine REST-Schnittstelle bereit.
 * Wer den (öffentlichen) Anon-Key kennt, könnte darüber sonst Tabellen lesen oder ändern.
 * Row Level Security ohne Freigabe-Regeln sperrt diesen Weg komplett. Die App selbst ist nicht betroffen:
 * Prisma verbindet sich als Eigentümer der Tabellen, und für den gilt RLS nicht.
 *
 * Sichtbarkeitsregeln innerhalb der App (z. B. wer welche Leistungsbewertung sehen darf, #65) prüft der Service
 * (src/services/ratingService.ts), weil alle Zugriffe der App über Prisma laufen.
 * Zusätzlich stehen hier Prüfregeln (CHECK), die die Datenbank selbst durchsetzt.
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
  "PlayerRating",
] as const;

/**
 * Prüfregeln, die zusätzlich zur App direkt in der Datenbank gelten (Prisma kann CHECK nicht im Schema ausdrücken).
 * Erst entfernen, dann anlegen, damit das Einspielen beliebig oft klappt.
 */
export const PRUEFREGELN_SQL: string[] = [
  // #65: Leistungsbewertung nur mit 1 bis 5 Sternen
  `ALTER TABLE "PlayerRating" DROP CONSTRAINT IF EXISTS player_rating_sterne`,
  `ALTER TABLE "PlayerRating" ADD CONSTRAINT player_rating_sterne CHECK (stars BETWEEN 1 AND 5)`,
];

export const ZUGRIFFSSCHUTZ_SQL: string[] = [
  ...APP_TABLES.map((t) => `ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY`),
  ...PRUEFREGELN_SQL,
];

export async function applyZugriffsschutz(prisma: PrismaClient) {
  await prisma.$transaction(async (tx) => {
    for (const sql of ZUGRIFFSSCHUTZ_SQL) await tx.$executeRawUnsafe(sql);
  });
}
