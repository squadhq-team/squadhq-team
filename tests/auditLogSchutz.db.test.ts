/**
 * Regressionstest für Defekt D-01 (docs/testing/akzeptanzkriterien.md):
 * Der Audit-Log-Schutz (REQ-AUD-01) muss sich auch gleichzeitig mehrfach einspielen lassen, ohne Fehler und
 * ohne dass das Audit-Log dabei auch nur kurz änderbar wird.
 * Läuft nur mit RUN_DB_TESTS=1 und einer Test-DB in DATABASE_URL (wie die anderen *.db.test.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { applyAuditLogSchutz } from "../prisma/auditLogSchutz";
import { createPastSession, createTestTeam } from "./helpers/testTeam";

const run = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!run)("Audit-Log-Schutz bei gleichzeitigem Einspielen (D-01)", () => {
  let auditId: string;

  beforeAll(async () => {
    const t = await createTestTeam("D-01", { trainer: "TRAINER", player: "PLAYER" });
    const session = await createPastSession(t.teamId, t.users.trainer);
    const attendance = await prisma.attendance.create({
      data: { sessionId: session.id, userId: t.users.player, status: "EXCUSED" },
    });
    auditId = (
      await prisma.auditLog.create({
        data: {
          teamId: t.teamId,
          attendanceId: attendance.id,
          actorId: t.users.trainer,
          action: "ANWESENHEIT_GESETZT",
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("fünf gleichzeitige Aufrufe laufen ohne Fehler durch, und kein Änderungsversuch kommt dazwischen durch", async () => {
    let fertig = false;
    const einspielen = Promise.all(Array.from({ length: 5 }, () => applyAuditLogSchutz(prisma))).finally(() => {
      fertig = true;
    });

    // Währenddessen versucht eine zweite Verbindung ununterbrochen, den Eintrag zu ändern
    let versuche = 0;
    let durchgekommen = 0;
    const angreifer = (async () => {
      do {
        versuche++;
        try {
          await prisma.auditLog.update({ where: { id: auditId }, data: { note: `Versuch ${versuche}` } });
          durchgekommen++;
        } catch (e) {
          if (!String(e).includes("AuditLog ist unveränderlich")) throw e;
        }
      } while (!fertig);
    })();

    await expect(einspielen).resolves.toBeDefined();
    await angreifer;
    expect(versuche).toBeGreaterThan(0);
    expect(durchgekommen).toBe(0);
  });
});
