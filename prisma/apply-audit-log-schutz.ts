/** Spielt den Schreibschutz des Audit-Logs ein (siehe prisma/auditLogSchutz.ts). Aufruf: npm run db:audit-schutz */
import { PrismaClient } from "@prisma/client";
import { applyAuditLogSchutz } from "./auditLogSchutz";

const prisma = new PrismaClient();

applyAuditLogSchutz(prisma)
  .then(() => console.log("Audit-Log-Schutz aktiv: Einträge lassen sich nur noch anlegen."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
