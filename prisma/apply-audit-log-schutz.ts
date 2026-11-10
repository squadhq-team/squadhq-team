/**
 * Spielt den Schreibschutz des Audit-Logs (prisma/auditLogSchutz.ts) und den Zugriffsschutz für die
 * Supabase-REST-Schnittstelle (prisma/zugriffsschutz.ts) ein. Aufruf: npm run db:audit-schutz
 */
import { PrismaClient } from "@prisma/client";
import { applyAuditLogSchutz } from "./auditLogSchutz";
import { applyZugriffsschutz } from "./zugriffsschutz";

const prisma = new PrismaClient();

async function main() {
  await applyAuditLogSchutz(prisma);
  console.log("Audit-Log-Schutz aktiv: Einträge lassen sich nur noch anlegen.");
  await applyZugriffsschutz(prisma);
  console.log("Zugriffsschutz aktiv: Tabellen sind nicht über die Supabase-REST-Schnittstelle erreichbar.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
