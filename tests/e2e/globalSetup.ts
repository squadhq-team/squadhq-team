/**
 * Vor jedem Lauf der Akzeptanztests: leere Test-Datenbank mit aktuellem Schema und Audit-Log-Schutz,
 * damit jeder Lauf mit demselben Ausgangszustand beginnt (wiederholbar).
 * Läuft nur gegen eine Datenbank auf diesem Rechner (localhost), nie gegen die Live-Datenbank bei Supabase.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { E2E_DATABASE_URL } from "../../playwright.config";

export default async function globalSetup() {
  const host = new URL(E2E_DATABASE_URL).hostname;
  if (!["localhost", "127.0.0.1"].includes(host)) {
    throw new Error(`Akzeptanztests nur gegen eine lokale Test-Datenbank, nicht gegen ${host}.`);
  }
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL, DIRECT_URL: E2E_DATABASE_URL };

  // Alles löschen (auch das sonst unlöschbare Audit-Log samt Schutz-Triggern) und neu anlegen
  const prisma = new PrismaClient({ datasourceUrl: E2E_DATABASE_URL });
  try {
    await prisma.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await prisma.$executeRawUnsafe("CREATE SCHEMA public");
  } finally {
    await prisma.$disconnect();
  }
  execSync("npx prisma db push --skip-generate", { env, stdio: "inherit" });
  execSync("npx tsx prisma/apply-audit-log-schutz.ts", { env, stdio: "inherit" });
}
