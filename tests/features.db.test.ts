/**
 * Komponententests der Abläufe aus dem Sprint „Features & Design“ gegen eine echte Datenbank:
 * Teams und Rollen, Trennung der Teams, Spiel → Pos. 9 (#47), manuelle Strafen (#46), Mahngebühr (#52),
 * Kassenbuch (#53), Beiträge, Umfragen (#50), Stellvertreter, Spielplan-Import.
 * Läuft nur mit RUN_DB_TESTS=1 und einer Test-DB in DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { parseBerlinDateTime } from "@/lib/format";
import { changeRole, createTeam, joinTeam, listRespondents } from "@/services/teamService";
import { getAttendanceList, importCalendar, respond, setByTrainer } from "@/services/attendanceService";
import { approvePenalty, cancelPenalty, createManualPenalty, getPlayerAccount } from "@/services/penaltyEngine";
import { addTransaction, applyLateFees, cancelTransaction, createFees, getTeamCash } from "@/services/paymentService";
import { createPoll, vote } from "@/services/newsService";
import { createPastSession, createTestTeam } from "./helpers/testTeam";

const run = process.env.RUN_DB_TESTS === "1";
const DAY = 86_400_000;

describe.skipIf(!run)("Sprint Features & Design (Datenbank)", () => {
  let teamId: string;
  let u: Record<string, string>;

  beforeAll(async () => {
    const t = await createTestTeam("FD", {
      trainer: "TRAINER",
      assistant: "ASSISTANT",
      cashier: "CASHIER",
      player: "PLAYER",
      parent: "GUARDIAN",
    });
    teamId = t.teamId;
    u = t.users;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Team gründen macht zum Trainer mit Katalog; Beitreten per Code macht zum Spieler; Demo-Team ist gesperrt", async () => {
    const founder = await prisma.user.create({ data: { name: "Gründer", role: "PLAYER" } });
    const team = await createTeam(founder.id, "Testverein 1. Herren");
    expect(await prisma.user.findUniqueOrThrow({ where: { id: founder.id } })).toMatchObject({
      teamId: team.id,
      role: "TRAINER",
    });
    expect(await prisma.penaltyRule.count({ where: { teamId: team.id } })).toBe(17);

    const joiner = await prisma.user.create({ data: { name: "Neuer", role: "TRAINER" } });
    await joinTeam(joiner.id, team.joinCode.toLowerCase());
    expect(await prisma.user.findUniqueOrThrow({ where: { id: joiner.id } })).toMatchObject({
      teamId: team.id,
      role: "PLAYER",
    });

    const demo = await prisma.team.create({
      data: { name: "Demo", joinCode: `D${Date.now()}`.slice(0, 12), isDemo: true },
    });
    const other = await prisma.user.create({ data: { name: "Fremd", role: "PLAYER" } });
    await expect(joinTeam(other.id, demo.joinCode)).rejects.toThrow(/gibt es nicht/);

    await expect(
      changeRole({ teamId: team.id, actorId: founder.id, userId: founder.id, role: "PLAYER" }),
    ).rejects.toThrow(/mindestens einen Trainer/);
    await changeRole({ teamId: team.id, actorId: founder.id, userId: joiner.id, role: "CASHIER" });
    const log = await prisma.auditLog.findFirst({ where: { subjectId: joiner.id, action: "ROLLE_GEAENDERT" } });
    expect(log?.note).toBe("PLAYER → CASHIER");
  });

  it("Teams sind getrennt: kein Zugriff auf Termine oder Mitglieder eines anderen Teams", async () => {
    const other = await createTestTeam("FREMD", { trainer: "TRAINER", player: "PLAYER" });
    const foreign = await createPastSession(other.teamId, other.users.trainer);
    await expect(getAttendanceList(teamId, foreign.id)).rejects.toThrow(/in deinem Team nicht/);
    await expect(
      setByTrainer({
        teamId,
        trainerId: u.trainer,
        sessionId: foreign.id,
        playerId: other.users.player,
        status: "UNEXCUSED",
      }),
    ).rejects.toThrow();
    await expect(
      createManualPenalty({
        teamId,
        actorId: u.trainer,
        directlyOpen: true,
        playerId: other.users.player,
        ruleId: "x",
        quantity: 1,
      }),
    ).rejects.toThrow();
  });

  it("#47: unentschuldigt beim Spiel schlägt Pos. 9 (40 €) vor, bei Feier nichts", async () => {
    const game = await createPastSession(teamId, u.trainer, "GAME");
    await setByTrainer({ teamId, trainerId: u.trainer, sessionId: game.id, playerId: u.player, status: "UNEXCUSED" });
    const entry = await prisma.penaltyEntry.findFirstOrThrow({
      where: { sessionId: game.id },
      include: { rule: true },
    });
    expect(entry).toMatchObject({ status: "PENDING_APPROVAL", amountCents: 4000 });
    expect(entry.rule?.position).toBe(9);

    const party = await createPastSession(teamId, u.trainer, "PARTY");
    await setByTrainer({ teamId, trainerId: u.trainer, sessionId: party.id, playerId: u.player, status: "UNEXCUSED" });
    expect(await prisma.penaltyEntry.count({ where: { sessionId: party.id } })).toBe(0);
  });

  it("#46: Trainer vergibt direkt offen, Betreuer nur als Vorschlag; Anzahl × Betrag", async () => {
    const late = await prisma.penaltyRule.findFirstOrThrow({ where: { teamId, title: { startsWith: "13B" } } });
    const items = await prisma.penaltyRule.findFirstOrThrow({ where: { teamId, position: 3 } });
    const byTrainer = await createManualPenalty({
      teamId,
      actorId: u.trainer,
      directlyOpen: true,
      playerId: u.player,
      ruleId: late.id,
      quantity: 1,
    });
    expect(byTrainer).toMatchObject({ status: "OPEN", amountCents: 500 });
    expect(byTrainer.dueDate).not.toBeNull();
    const byAssistant = await createManualPenalty({
      teamId,
      actorId: u.assistant,
      directlyOpen: false,
      playerId: u.cashier,
      ruleId: items.id,
      quantity: 3,
    });
    expect(byAssistant).toMatchObject({ status: "PENDING_APPROVAL", amountCents: 600, quantity: 3 });
    await approvePenalty(teamId, byAssistant.id, u.trainer);
    expect((await getPlayerAccount(teamId, u.cashier)).saldoCents).toBe(600);
  });

  it("#52: Mahngebühr wird je Woche einmal automatisch gebucht, erlassene kommt nicht wieder", async () => {
    const rule = await prisma.penaltyRule.findFirstOrThrow({ where: { teamId, position: 8 } });
    const old = await prisma.penaltyEntry.create({
      data: {
        teamId,
        playerId: u.player,
        ruleId: rule.id,
        amountCents: 2000,
        status: "OPEN",
        dueDate: new Date(Date.now() - 10 * DAY),
      },
    });
    await Promise.all([applyLateFees(teamId), applyLateFees(teamId)]);
    const fees = await prisma.penaltyEntry.findMany({ where: { parentId: old.id }, orderBy: { lateFeeWeek: "asc" } });
    expect(fees.map((f) => [f.lateFeeWeek, f.amountCents, f.kind])).toEqual([
      [1, 500, "LATE_FEE"],
      [2, 500, "LATE_FEE"],
    ]);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { entryId: fees[0].id } });
    expect(log).toMatchObject({ action: "MAHNGEBUEHR", actorId: null });

    await cancelPenalty(teamId, fees[1].id, u.cashier, "Staffelung abgesprochen");
    await applyLateFees(teamId);
    expect(await prisma.penaltyEntry.count({ where: { parentId: old.id } })).toBe(2);
    expect(
      (await prisma.auditLog.findFirstOrThrow({ where: { entryId: fees[1].id, action: "ERLASSEN" } })).note,
    ).toMatch(/Staffelung/);
  });

  it("#53 und Beiträge: Kassenstand = bezahlte Forderungen + Einnahmen − Ausgaben; Storno zählt nicht", async () => {
    const before = await getTeamCash(teamId);
    await addTransaction({
      teamId,
      actorId: u.cashier,
      direction: "INCOME",
      amountCents: 10000,
      description: "Sponsor",
    });
    const drinks = await addTransaction({
      teamId,
      actorId: u.cashier,
      direction: "EXPENSE",
      amountCents: 1800,
      description: "Getränke",
    });
    const wrong = await addTransaction({
      teamId,
      actorId: u.cashier,
      direction: "EXPENSE",
      amountCents: 999,
      description: "Tippfehler",
    });
    await cancelTransaction({ teamId, actorId: u.cashier, transactionId: wrong.id });
    const after = await getTeamCash(teamId);
    expect(after.balanceCents - before.balanceCents).toBe(10000 - 1800);
    expect(await prisma.auditLog.count({ where: { transactionId: { in: [drinks.id, wrong.id] } } })).toBe(3);

    const count = await createFees({
      teamId,
      actorId: u.cashier,
      title: "Saisonbeitrag",
      amountCents: 5000,
      playerIds: [u.player, u.cashier, u.trainer],
    });
    expect(count).toBe(2); // Trainer gehört nicht zum Kader
  });

  it("Stellvertreter sagt für ein verknüpftes Mitglied zu, aber nicht für andere", async () => {
    const kid = await prisma.user.create({ data: { name: "Kind", role: "PLAYER", teamId, managedById: u.parent } });
    const parent = await prisma.user.findUniqueOrThrow({ where: { id: u.parent } });
    expect((await listRespondents(parent)).map((r) => r.id)).toEqual([kid.id]);
    const next = await prisma.trainingSession.create({
      data: {
        teamId,
        title: "Nächstes",
        startsAt: new Date(Date.now() + 2 * DAY),
        responseDeadline: new Date(Date.now() + DAY),
        createdById: u.trainer,
      },
    });
    await respond({ teamId, actor: parent, memberId: kid.id, sessionId: next.id, status: "ATTENDING" });
    await expect(
      respond({ teamId, actor: parent, memberId: u.player, sessionId: next.id, status: "ATTENDING" }),
    ).rejects.toThrow(/nur für dich/);
  });

  it("#50: Einfachauswahl ersetzt die Stimme, Mehrfachauswahl schaltet an/aus", async () => {
    const single = await createPoll({
      teamId,
      createdById: u.trainer,
      question: "Essen?",
      options: ["Pizza", "Burger"],
      multiple: false,
    });
    const opts = await prisma.pollOption.findMany({ where: { pollId: single.id }, orderBy: { order: "asc" } });
    await vote({ teamId, userId: u.player, optionId: opts[0].id });
    await vote({ teamId, userId: u.player, optionId: opts[1].id });
    expect(
      await prisma.pollVote.findMany({ where: { userId: u.player, optionId: { in: opts.map((o) => o.id) } } }),
    ).toHaveLength(1);

    const multi = await createPoll({
      teamId,
      createdById: u.trainer,
      question: "Wann?",
      options: ["Fr", "Sa"],
      multiple: true,
    });
    const mo = await prisma.pollOption.findMany({ where: { pollId: multi.id } });
    await vote({ teamId, userId: u.player, optionId: mo[0].id });
    await vote({ teamId, userId: u.player, optionId: mo[1].id });
    await vote({ teamId, userId: u.player, optionId: mo[0].id });
    expect(await prisma.pollVote.count({ where: { userId: u.player, optionId: { in: mo.map((o) => o.id) } } })).toBe(1);
  });

  it("Spielplan-Import legt zukünftige Spiele an und aktualisiert beim zweiten Import statt doppelt", async () => {
    const future = new Date(Date.now() + 5 * DAY);
    const stamp = future.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const ics = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:imp-1\nDTSTART:${stamp}\nSUMMARY:Heimspiel\nEND:VEVENT\nBEGIN:VEVENT\nUID:imp-0\nDTSTART:20200101T120000Z\nSUMMARY:Alt\nEND:VEVENT\nEND:VCALENDAR`;
    const first = await importCalendar({
      teamId,
      trainerId: u.trainer,
      icsText: ics,
      type: "GAME",
      toBerlin: parseBerlinDateTime,
    });
    expect(first).toEqual({ created: 1, updated: 0, skipped: 1 });
    const second = await importCalendar({
      teamId,
      trainerId: u.trainer,
      icsText: ics.replace("Heimspiel", "Heimspiel (verlegt)"),
      type: "GAME",
      toBerlin: parseBerlinDateTime,
    });
    expect(second).toMatchObject({ created: 0, updated: 1 });
    expect((await prisma.trainingSession.findFirstOrThrow({ where: { teamId, importUid: "imp-1" } })).title).toBe(
      "Heimspiel (verlegt)",
    );
  });
});
