/**
 * Komponententest der täglichen Erinnerung (#26) gegen eine echte Datenbank: Push und E-Mail gehen nur an Mitglieder
 * ohne Rückmeldung (bzw. ihre Stellvertreter), nur bei Terminen mit Frist in den nächsten 30 Stunden.
 * Mailserver und Push-Dienst sind durch Attrappen ersetzt. Läuft nur mit RUN_DB_TESTS=1.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { respond } from "@/services/attendanceService";
import { setEmailReminders } from "@/services/teamService";
import { sendDeadlineReminders } from "@/services/reminderService";
import type { MailMessage } from "@/services/mailService";
import { createTestTeam } from "./helpers/testTeam";

const run = process.env.RUN_DB_TESTS === "1";
const HOUR = 3_600_000;

describe.skipIf(!run)("#26 tägliche Erinnerung (Datenbank)", () => {
  let teamId: string;
  let u: Record<string, string>;
  let sessionId: string;
  const tag = Math.random().toString(36).slice(2, 8);
  const mail = (k: string) => `${k}-${tag}@example.com`;

  beforeAll(async () => {
    const t = await createTestTeam("ER", {
      trainer: "TRAINER",
      yes: "PLAYER",
      player: "PLAYER",
      off: "PLAYER",
      parent: "GUARDIAN",
    });
    teamId = t.teamId;
    u = t.users;
    for (const k of ["trainer", "yes", "player", "off", "parent"])
      await prisma.user.update({ where: { id: u[k] }, data: { email: mail(k) } });
    await setEmailReminders(u.off, false);
    // Kind ohne eigenes Konto, vertreten vom Elternteil
    const kid = await prisma.user.create({
      data: { name: "ER Kind", role: "PLAYER", teamId, managedById: u.parent },
    });
    u.kid = kid.id;
    const soon = await prisma.trainingSession.create({
      data: {
        teamId,
        title: "Training bald",
        startsAt: new Date(Date.now() + 30 * HOUR),
        responseDeadline: new Date(Date.now() + 20 * HOUR),
        createdById: u.trainer,
      },
    });
    sessionId = soon.id;
    // Frist erst in drei Tagen: noch keine Erinnerung
    await prisma.trainingSession.create({
      data: {
        teamId,
        title: "Training später",
        startsAt: new Date(Date.now() + 96 * HOUR),
        responseDeadline: new Date(Date.now() + 72 * HOUR),
        createdById: u.trainer,
      },
    });
    await respond({ teamId, actor: { id: u.yes, role: "PLAYER" }, memberId: u.yes, sessionId, status: "ATTENDING" });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("schickt Push und Mail nur an Mitglieder ohne Rückmeldung, Stellvertreter bekommen die Mail für das Kind", async () => {
    const sent: MailMessage[] = [];
    const pushed: string[][] = [];
    await sendDeadlineReminders(new Date(), {
      pushEnabled: true,
      push: async (ids) => {
        pushed.push(ids);
      },
      mailer: { send: async (m) => void sent.push(m), close: () => {} },
      baseUrl: "https://app.test",
    });

    const ours = sent.filter((m) => m.to.endsWith(`-${tag}@example.com`));
    expect(ours.map((m) => m.to).sort()).toEqual([mail("parent"), mail("player")].sort());
    expect(ours.every((m) => m.subject.includes("Training bald"))).toBe(true);
    expect(ours.find((m) => m.to === mail("parent"))!.text).toContain("von ER Kind.");
    expect(ours[0].text).toContain(`https://app.test/termine/${sessionId}`);

    const pushIds = pushed.find((ids) => ids.includes(u.player))!;
    expect(pushIds.sort()).toEqual([u.player, u.off, u.kid].sort());
  });

  it("macht nichts, wenn weder Push noch Mail eingerichtet sind", async () => {
    expect(await sendDeadlineReminders(new Date(), { pushEnabled: false, mailer: null })).toEqual({
      push: 0,
      email: 0,
      emailFailed: 0,
    });
  });

  it("zählt fehlgeschlagene Mails, ohne abzubrechen", async () => {
    const result = await sendDeadlineReminders(new Date(), {
      pushEnabled: false,
      mailer: {
        send: async (m) => {
          if (m.to === mail("player")) throw new Error("SMTP kaputt");
        },
        close: () => {},
      },
      baseUrl: "https://app.test",
    });
    expect(result.emailFailed).toBeGreaterThanOrEqual(1);
    expect(result.email).toBeGreaterThanOrEqual(1);
  });
});
