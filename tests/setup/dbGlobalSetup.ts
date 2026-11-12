/**
 * Vorbereitung der Test-Datenbank, läuft EINMAL vor allen Testdateien (Vitest „globalSetup“), nur mit RUN_DB_TESTS=1.
 * Wie in der App (`npm run db:audit-schutz`) wird der Audit-Log-Schutz einmal eingespielt, und die Katalogregel
 * Pos. 8 (20 € unentschuldigtes Fehlen), die alle DB-Tests brauchen, wird einmal angelegt.
 * Früher hat das jede DB-Testdatei selbst in `beforeAll` gemacht. Weil Vitest die Dateien parallel startet,
 * liefen die Schritte gleichzeitig und die Tests wurden sporadisch rot (Defekt D-01).
 */
import { PrismaClient } from "@prisma/client";
import { applyAuditLogSchutz } from "../../prisma/auditLogSchutz";

export default async function setup() {
  if (process.env.RUN_DB_TESTS !== "1") return;
  const prisma = new PrismaClient();
  try {
    await applyAuditLogSchutz(prisma);
    await prisma.penaltyRule.upsert({
      where: { position: 8 },
      create: {
        position: 8,
        title: "Unentschuldigtes Fehlen beim Training",
        amountCents: 2000,
        trigger: "UNEXCUSED_ABSENCE",
      },
      update: {},
    });
  } finally {
    await prisma.$disconnect();
  }
}
