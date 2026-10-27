/**
 * Komponententest des Ablaufs REQ-PEN-02 gegen eine echte Datenbank (alle drei Akzeptanzkriterien).
 * Läuft nur mit RUN_DB_TESTS=1 und einer Test-DB in DATABASE_URL, da die Daten neu angelegt werden.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setByTrainer } from "@/services/attendanceService";
import { approvePenalty } from "@/services/penaltyEngine";

const run = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!run)("Ablauf Strafvorschlag (REQ-PEN-02)", () => {
  let trainerId: string;
  let playerId: string;
  let sessionId: string;

  beforeAll(async () => {
    const trainer = await prisma.user.create({ data: { name: "Test Trainer", role: "TRAINER" } });
    const player = await prisma.user.create({ data: { name: "Test Spieler", role: "PLAYER" } });
    await prisma.penaltyRule.upsert({
      where: { position: 8 },
      create: { position: 8, title: "Unentschuldigtes Fehlen beim Training", amountCents: 2000, trigger: "UNEXCUSED_ABSENCE" },
      update: {},
    });
    const session = await prisma.trainingSession.create({
      data: { title: "Testtraining", startsAt: new Date(Date.now() - 86_400_000), responseDeadline: new Date(Date.now() - 2 * 86_400_000), createdById: trainer.id },
    });
    trainerId = trainer.id;
    playerId = player.id;
    sessionId = session.id;
  });

  afterAll(async () => {
    await prisma.trainingSession.delete({ where: { id: sessionId } });
    await prisma.penaltyEntry.deleteMany({ where: { playerId } });
    await prisma.attendance.deleteMany({ where: { userId: playerId } });
    await prisma.user.deleteMany({ where: { id: { in: [trainerId, playerId] } } });
    await prisma.$disconnect();
  });

  const entries = () => prisma.penaltyEntry.findMany({ where: { playerId, sessionId }, include: { auditLog: true } });

  it("AK1: UNEXCUSED erzeugt genau einen Entwurf über 20,00 €", async () => {
    await setByTrainer({ trainerId, sessionId, playerId, status: "UNEXCUSED" });
    await setByTrainer({ trainerId, sessionId, playerId, status: "UNEXCUSED" });
    const list = await entries();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ status: "PENDING_APPROVAL", amountCents: 2000 });
  });

  it("AK2: Freigabe setzt OPEN und eine Fälligkeit", async () => {
    const [entry] = await entries();
    await approvePenalty(entry.id, trainerId);
    const [after] = await entries();
    expect(after.status).toBe("OPEN");
    expect(after.dueDate).not.toBeNull();
  });

  it("AK3: nachträglich EXCUSED storniert die Strafe und protokolliert es im Audit-Log", async () => {
    await setByTrainer({ trainerId, sessionId, playerId, status: "EXCUSED" });
    const [after] = await entries();
    expect(after.status).toBe("CANCELLED");
    expect(after.auditLog.map((a) => a.action)).toEqual(expect.arrayContaining(["VORGESCHLAGEN", "FREIGEGEBEN", "STORNIERT"]));
  });
});
