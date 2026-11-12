/**
 * Komponententests der P4-Abläufe gegen eine echte Datenbank: Zahlung (MVP-5), Teamkasse (MVP-4),
 * Protokoll der Anwesenheit (MVP-6), Training anlegen (MVP-1) und Registrierung.
 * Läuft nur mit RUN_DB_TESTS=1 und einer Test-DB in DATABASE_URL (wie tests/penaltyFlow.db.test.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createSession, setByTrainer } from "@/services/attendanceService";
import { approvePenalty } from "@/services/penaltyEngine";
import { getTeamCash, recordPayment } from "@/services/paymentService";
import { ensureAppUser } from "@/lib/registration";
import { createPastSession, createTestTeam } from "./helpers/testTeam";

const run = process.env.RUN_DB_TESTS === "1";
const DAY = 86_400_000;

describe.skipIf(!run)("P4-Abläufe (MVP-1, MVP-4, MVP-5, MVP-6, Registrierung)", () => {
  let teamId: string;
  let trainerId: string;
  let cashierId: string;
  let playerId: string;
  let sessionId: string;

  beforeAll(async () => {
    // Audit-Log-Schutz legt tests/setup/dbGlobalSetup.ts einmal vorab an (D-01), Team und Katalog die Testhilfe
    const t = await createTestTeam("P4", { trainer: "TRAINER", cashier: "CASHIER", player: "PLAYER" });
    teamId = t.teamId;
    trainerId = t.users.trainer;
    cashierId = t.users.cashier;
    playerId = t.users.player;
    sessionId = (await createPastSession(teamId, trainerId)).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const attendanceLog = () =>
    prisma.auditLog.findMany({ where: { attendance: { sessionId, userId: playerId } }, orderBy: { createdAt: "asc" } });

  it("MVP-6: Trainer-Änderungen an der Anwesenheit werden protokolliert, unveränderte Klicks nicht", async () => {
    await setByTrainer({ teamId, trainerId, sessionId, playerId, status: "EXCUSED" });
    await setByTrainer({ teamId, trainerId, sessionId, playerId, status: "EXCUSED" });
    await setByTrainer({ teamId, trainerId, sessionId, playerId, status: "UNEXCUSED" });
    const log = await attendanceLog();
    expect(log.map((l) => [l.oldAttendance, l.newAttendance])).toEqual([
      [null, "EXCUSED"],
      ["EXCUSED", "UNEXCUSED"],
    ]);
    expect(log.every((l) => l.actorId === trainerId && l.action === "ANWESENHEIT_GESETZT")).toBe(true);
  });

  it("MVP-6: ein Protokolleintrag betrifft genau eine Strafe oder eine Anwesenheit", async () => {
    await expect(prisma.auditLog.create({ data: { teamId, actorId: trainerId, action: "TEST" } })).rejects.toThrow();
  });

  it("AK4/MVP-5: Teilzahlung, dann Rest per PayPal; jeder Schritt im Protokoll mit Kassenwart", async () => {
    const entry = await prisma.penaltyEntry.findFirstOrThrow({
      where: { sessionId, playerId, status: "PENDING_APPROVAL" },
    });
    await approvePenalty(teamId, entry.id, trainerId);

    await recordPayment({ teamId, entryId: entry.id, actorId: cashierId, method: "CASH", amountCents: 500 });
    const partial = await prisma.penaltyEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(partial).toMatchObject({ status: "PARTIAL", paidCents: 500, method: "CASH" });

    await recordPayment({ teamId, entryId: entry.id, actorId: cashierId, method: "PAYPAL" });
    const after = await prisma.penaltyEntry.findUniqueOrThrow({
      where: { id: entry.id },
      include: { auditLog: { orderBy: { createdAt: "asc" } } },
    });
    expect(after).toMatchObject({ status: "PAID_PAYPAL", paidCents: 2000, method: "PAYPAL" });
    expect(after.auditLog.map((a) => a.action)).toEqual(["VORGESCHLAGEN", "FREIGEGEBEN", "TEILZAHLUNG", "BEZAHLT"]);
    expect(after.auditLog.slice(2).every((a) => a.actorId === cashierId)).toBe(true);

    await expect(recordPayment({ teamId, entryId: entry.id, actorId: cashierId, method: "CASH" })).rejects.toThrow(
      /nicht offen/,
    );
  });

  it("MVP-4: Teamkasse zeigt bezahlte Strafen und markiert überfällige", async () => {
    const overdue = await prisma.penaltyEntry.create({
      data: {
        teamId,
        playerId,
        ruleId: (await prisma.penaltyRule.findUniqueOrThrow({ where: { teamId_position: { teamId, position: 8 } } }))
          .id,
        amountCents: 2000,
        status: "OPEN",
        dueDate: new Date(Date.now() - 3 * DAY),
        createdById: trainerId,
      },
    });
    const cash = await getTeamCash(teamId);
    const row = cash.open.find((e) => e.id === overdue.id);
    expect(row).toMatchObject({ overdue: true, openCents: 2000 });
    // #52: Mahngebühr für die 1. Woche Verzug ist automatisch gebucht
    const fee = cash.open.find((e) => e.parentId === overdue.id);
    expect(fee).toMatchObject({ kind: "LATE_FEE", lateFeeWeek: 1, amountCents: 500, status: "OPEN" });
    expect(cash.paid.some((e) => e.playerId === playerId && e.status === "PAID_PAYPAL")).toBe(true);
    expect(cash.balances.find((b) => b.name === "P4 player")?.saldoCents).toBe(2500);
  });

  it("MVP-1: Trainer legt ein Training an, Frist standardmäßig 3 Stunden vorher", async () => {
    const startsAt = new Date(Date.now() + 2 * DAY);
    const session = await createSession({
      teamId,
      trainerId,
      type: "TRAINING",
      title: " ",
      startsAt,
      location: "Platz 2",
    });
    expect(session).toMatchObject({ title: "Mannschaftstraining", location: "Platz 2", createdById: trainerId });
    expect(startsAt.getTime() - session.responseDeadline.getTime()).toBe(3 * 60 * 60 * 1000);
    await expect(
      createSession({ teamId, trainerId, type: "TRAINING", title: "x", startsAt: new Date(Date.now() - DAY) }),
    ).rejects.toThrow(/Zukunft/);
    await expect(
      createSession({
        teamId,
        trainerId,
        type: "TRAINING",
        title: "x",
        startsAt,
        responseDeadline: new Date(startsAt.getTime() + 1000),
      }),
    ).rejects.toThrow(/vor dem Beginn/);
  });

  it("Registrierung: Supabase-Konto wird genau einmal als Spieler verknüpft", async () => {
    const authId = crypto.randomUUID();
    const email = `p4-${Date.now()}@example.org`;
    const user = await ensureAppUser({ id: authId, email: email.toUpperCase(), name: "Neu Spieler" });
    expect(user).toMatchObject({ authId, email, name: "Neu Spieler", role: "PLAYER", teamId: null });
    // erneute Anmeldung: derselbe Nutzer, kein zweiter
    expect((await ensureAppUser({ id: authId, email })).id).toBe(user.id);
    // neues Supabase-Konto mit derselben E-Mail: vorhandener Nutzer wird neu verknüpft
    const newAuthId = crypto.randomUUID();
    const relinked = await ensureAppUser({ id: newAuthId, email });
    expect(relinked).toMatchObject({ id: user.id, authId: newAuthId });
  });
});
