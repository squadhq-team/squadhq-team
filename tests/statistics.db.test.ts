/**
 * Komponententests der Statistik (#65) gegen eine echte Datenbank: Bewerten nach dem Training, Sichtbarkeit der
 * Bewertungen (Spieler sieht nur eigene, auch nicht über die direkte Adresse), Prüfregel 1–5 Sterne in der Datenbank,
 * Top-Strafen und Kassenverlauf passend zur Teamkasse.
 * Läuft nur mit RUN_DB_TESTS=1 und einer Test-DB in DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { setByTrainer } from "@/services/attendanceService";
import { approvePenalty, createManualPenalty } from "@/services/penaltyEngine";
import { addTransaction, getTeamCash, recordPayment } from "@/services/paymentService";
import {
  getPlayerRatings,
  getRatingOverview,
  listVisibleRatingsForSession,
  ratePlayer,
  removeRating,
} from "@/services/ratingService";
import { getCashHistory, getTopPenalties } from "@/services/statsService";
import { createPastSession, createTestTeam } from "./helpers/testTeam";

const run = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!run)("Statistik und Leistungsbewertung (Datenbank)", () => {
  let teamId: string;
  let u: Record<string, string>;
  let users: Record<string, User & { teamId: string }>;
  let sessionId: string;

  beforeAll(async () => {
    const t = await createTestTeam("ST", {
      trainer: "TRAINER",
      assistant: "ASSISTANT",
      cashier: "CASHIER",
      paul: "PLAYER",
      tim: "PLAYER",
      parent: "GUARDIAN",
    });
    teamId = t.teamId;
    u = t.users;
    await prisma.user.update({ where: { id: u.tim }, data: { managedById: u.parent } });
    users = Object.fromEntries(
      await Promise.all(
        Object.entries(u).map(async ([k, id]) => [
          k,
          (await prisma.user.findUniqueOrThrow({ where: { id } })) as User & { teamId: string },
        ]),
      ),
    );
    sessionId = (await createPastSession(teamId, u.trainer)).id;
    for (const p of [u.paul, u.tim])
      await setByTrainer({ teamId, trainerId: u.trainer, sessionId, playerId: p, status: "ATTENDING" });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Trainer bewertet Anwesende; erneutes Bewerten überschreibt, Entfernen löscht", async () => {
    await ratePlayer({ teamId, rater: users.trainer, sessionId, playerId: u.paul, stars: 3, note: " Laufwege " });
    await ratePlayer({ teamId, rater: users.assistant, sessionId, playerId: u.tim, stars: 5 });
    await ratePlayer({ teamId, rater: users.trainer, sessionId, playerId: u.paul, stars: 4, note: "Laufwege" });
    const all = await prisma.playerRating.findMany({ where: { sessionId }, orderBy: { stars: "asc" } });
    expect(all.map((r) => [r.playerId, r.stars, r.note])).toEqual([
      [u.paul, 4, "Laufwege"],
      [u.tim, 5, null],
    ]);
    await removeRating({ teamId, rater: users.trainer, sessionId, playerId: u.tim });
    expect(await prisma.playerRating.count({ where: { sessionId } })).toBe(1);
    await ratePlayer({ teamId, rater: users.trainer, sessionId, playerId: u.tim, stars: 2, note: "Flanken üben" });
  });

  it("Spieler, Kassenwart und Elternteil dürfen nicht bewerten; Abwesende und Fremde nicht bewertbar", async () => {
    for (const rater of [users.paul, users.cashier, users.parent])
      await expect(ratePlayer({ teamId, rater, sessionId, playerId: u.tim, stars: 5 })).rejects.toThrow(
        /Trainer und Betreuer/,
      );
    await setByTrainer({ teamId, trainerId: u.trainer, sessionId, playerId: u.cashier, status: "EXCUSED" });
    await expect(
      ratePlayer({ teamId, rater: users.trainer, sessionId, playerId: u.cashier, stars: 3 }),
    ).rejects.toThrow(/dabei war/);
    const other = await createTestTeam("ST2", { fremd: "PLAYER" });
    await expect(
      ratePlayer({ teamId, rater: users.trainer, sessionId, playerId: other.users.fremd, stars: 3 }),
    ).rejects.toThrow(/nicht zu deinem Team/);
  });

  it("Datenbank lehnt Sterne außerhalb 1–5 ab (Prüfregel), auch am Service vorbei", async () => {
    await expect(
      prisma.playerRating.update({
        where: { sessionId_playerId: { sessionId, playerId: u.paul } },
        data: { stars: 6 },
      }),
    ).rejects.toThrow(/player_rating_sterne/);
  });

  it("Spieler sieht nur die eigene Bewertung, Elternteil die seines Mitglieds, Trainer alle", async () => {
    const forPaul = await listVisibleRatingsForSession(users.paul, sessionId);
    expect(forPaul.map((r) => r.playerId)).toEqual([u.paul]);
    const forParent = await listVisibleRatingsForSession(users.parent, sessionId);
    expect(forParent.map((r) => r.playerId)).toEqual([u.tim]);
    expect(await listVisibleRatingsForSession(users.cashier, sessionId)).toEqual([]);
    expect((await listVisibleRatingsForSession(users.trainer, sessionId)).length).toBe(2);

    const overviewPaul = await getRatingOverview(users.paul);
    expect(overviewPaul.seesAll).toBe(false);
    expect(overviewPaul.rows.map((r) => r.member.id)).toEqual([u.paul]);
    const overviewTrainer = await getRatingOverview(users.trainer);
    expect(overviewTrainer.rows.find((r) => r.member.id === u.tim)?.average).toBe(2);
  });

  it("fremde Bewertungen auch über die direkte Adresse nicht erreichbar", async () => {
    await expect(getPlayerRatings(users.paul, u.tim)).rejects.toThrow(/nicht sehen/);
    await expect(getPlayerRatings(users.cashier, u.paul)).rejects.toThrow(/nicht sehen/);
    const own = await getPlayerRatings(users.paul, u.paul);
    expect(own.ratings.map((r) => r.note)).toEqual(["Laufwege"]);
    expect((await getPlayerRatings(users.parent, u.tim)).average).toBe(2);
    const other = await createTestTeam("ST3", { trainer: "TRAINER" });
    const foreignTrainer = (await prisma.user.findUniqueOrThrow({ where: { id: other.users.trainer } })) as User & {
      teamId: string;
    };
    await expect(getPlayerRatings(foreignTrainer, u.paul)).rejects.toThrow(/nicht sehen/);
  });

  it("Top-Strafen und Kassenverlauf: letzter Punkt = Kassenstand der Teamkasse", async () => {
    const rules = await prisma.penaltyRule.findMany({ where: { teamId } });
    const forgot = rules.find((r) => r.position === 3)!;
    const late = rules.find((r) => r.title.startsWith("13B"))!;
    const a = await createManualPenalty({
      teamId,
      actorId: u.trainer,
      directlyOpen: true,
      playerId: u.paul,
      ruleId: forgot.id,
      quantity: 2,
    });
    const proposal = await createManualPenalty({
      teamId,
      actorId: u.assistant,
      directlyOpen: false,
      playerId: u.tim,
      ruleId: late.id,
      quantity: 1,
    });
    // Vorschlag zählt erst nach der Freigabe
    expect(await getTopPenalties(teamId)).toEqual([
      { ruleId: forgot.id, title: `Pos. 3 · ${forgot.title}`, count: 2, totalCents: forgot.amountCents * 2 },
    ]);
    await approvePenalty(teamId, proposal.id, u.trainer);
    expect((await getTopPenalties(teamId)).map((t) => t.ruleId)).toEqual([forgot.id, late.id]);

    await recordPayment({ teamId, entryId: a.id, actorId: u.cashier, method: "CASH", amountCents: 100 });
    await addTransaction({
      teamId,
      actorId: u.cashier,
      direction: "EXPENSE",
      amountCents: 50,
      description: "Bälle aufpumpen",
    });
    const payment = await prisma.auditLog.findFirst({ where: { entryId: a.id, action: "TEILZAHLUNG" } });
    expect(payment?.amountCents).toBe(100);

    const history = await getCashHistory(teamId);
    const cash = await getTeamCash(teamId);
    expect(history.balanceCents).toBe(cash.balanceCents);
    expect(history.points.at(-1)?.balanceCents).toBe(cash.balanceCents);
    expect(history.startCents).toBe(0);
  });
});
