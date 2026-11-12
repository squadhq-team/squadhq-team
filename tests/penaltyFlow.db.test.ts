/**
 * Komponententest des Ablaufs REQ-PEN-02 gegen eine echte Datenbank (alle drei Akzeptanzkriterien).
 * Läuft nur mit RUN_DB_TESTS=1 und einer Test-DB in DATABASE_URL, da die Daten neu angelegt werden.
 * Das Audit-Log ist unlöschbar (REQ-AUD-01), deshalb bleiben die Testdaten in der Test-DB; `npm run db:reset` räumt sie weg.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setByTrainer } from "@/services/attendanceService";
import { approvePenalty } from "@/services/penaltyEngine";
import { createPastSession, createTestTeam } from "./helpers/testTeam";

const run = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!run)("Ablauf Strafvorschlag (REQ-PEN-02)", () => {
  let teamId: string;
  let trainerId: string;
  let playerId: string;
  let sessionId: string;

  beforeAll(async () => {
    // Audit-Log-Schutz legt tests/setup/dbGlobalSetup.ts einmal vorab an (D-01), Team und Katalog die Testhilfe
    const t = await createTestTeam("PEN-02", { trainer: "TRAINER", player: "PLAYER" });
    teamId = t.teamId;
    trainerId = t.users.trainer;
    playerId = t.users.player;
    sessionId = (await createPastSession(teamId, trainerId)).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const entries = () => prisma.penaltyEntry.findMany({ where: { playerId, sessionId }, include: { auditLog: true } });

  it("AK1: UNEXCUSED erzeugt genau einen Entwurf über 20,00 €", async () => {
    await setByTrainer({ teamId, trainerId, sessionId, playerId, status: "UNEXCUSED" });
    await setByTrainer({ teamId, trainerId, sessionId, playerId, status: "UNEXCUSED" });
    const list = await entries();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ status: "PENDING_APPROVAL", amountCents: 2000 });
  });

  it("AK2: Freigabe setzt OPEN und eine Fälligkeit", async () => {
    const [entry] = await entries();
    await approvePenalty(teamId, entry.id, trainerId);
    const [after] = await entries();
    expect(after.status).toBe("OPEN");
    expect(after.dueDate).not.toBeNull();
  });

  it("AK3: nachträglich EXCUSED storniert die Strafe und protokolliert es im Audit-Log", async () => {
    await setByTrainer({ teamId, trainerId, sessionId, playerId, status: "EXCUSED" });
    const [after] = await entries();
    expect(after.status).toBe("CANCELLED");
    expect(after.auditLog.map((a) => a.action)).toEqual(
      expect.arrayContaining(["VORGESCHLAGEN", "FREIGEGEBEN", "STORNIERT"]),
    );
  });

  it("AK5: Protokolleinträge lassen sich weder ändern noch löschen, auch nicht über die Strafe", async () => {
    const [entry] = await entries();
    const first = entry.auditLog[0];
    await expect(prisma.auditLog.update({ where: { id: first.id }, data: { note: "geändert" } })).rejects.toThrow(
      /unveränderlich/,
    );
    await expect(prisma.auditLog.delete({ where: { id: first.id } })).rejects.toThrow(/unveränderlich/);
    await expect(prisma.penaltyEntry.delete({ where: { id: entry.id } })).rejects.toThrow();
    await expect(prisma.$executeRawUnsafe('TRUNCATE "AuditLog" CASCADE')).rejects.toThrow(/unveränderlich/);
    const [after] = await entries();
    expect(after.auditLog).toHaveLength(entry.auditLog.length);
  });
});
