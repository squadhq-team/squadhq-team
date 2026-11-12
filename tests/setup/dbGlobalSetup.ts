/**
 * Vorbereitung der Test-Datenbank, läuft EINMAL vor allen Testdateien (Vitest „globalSetup“), nur mit RUN_DB_TESTS=1.
 * Wie in der App (`npm run db:audit-schutz`) wird der Audit-Log-Schutz einmal eingespielt.
 * Früher hat das jede DB-Testdatei selbst in `beforeAll` gemacht. Weil Vitest die Dateien parallel startet,
 * liefen die Schritte gleichzeitig und die Tests wurden sporadisch rot (Defekt D-01).
 * Seit es Teams gibt, legt jede Testdatei ihr eigenes Team samt Katalog an (tests/helpers/testTeam.ts).
 */
import { PrismaClient } from "@prisma/client";
import { applyAuditLogSchutz } from "../../prisma/auditLogSchutz";

export default async function setup() {
  if (process.env.RUN_DB_TESTS !== "1") return;
  const prisma = new PrismaClient();
  try {
    await applyAuditLogSchutz(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
