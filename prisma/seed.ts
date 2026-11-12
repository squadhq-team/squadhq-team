/**
 * Demo-Daten für die Präsentationen (Stand Sprint Features & Design). Alle Zeiten relativ zum Ladetag, deshalb am Vortag `npm run db:reset`.
 * Alles gehört zum Demo-Team (isDemo): Nur dessen Personen erscheinen in der Demo-Anmeldung, echte Teams sehen nichts davon.
 * Strafenkatalog: vollständiger TSVK-Strafenkatalog 2026/27 aus prisma/strafenkatalog.ts
 * (Quelle: docs/anforderungen/strafenkatalog-tsvk-2026-27.md).
 * Personen sind erfunden.
 */
import { PrismaClient } from "@prisma/client";
import { STRAFENKATALOG } from "./strafenkatalog";
import { TESTKONTEN, testkontenAnlegen } from "./testkonten";

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Trainingszeit relativ zu heute, 19:00 Uhr. */
function trainingAt(daysFromToday: number): Date {
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  return new Date(d.getTime() + daysFromToday * DAY);
}

async function main() {
  // Nur auf leerer Datenbank (npm run db:reset): Das Audit-Log ist gegen Löschen geschützt (prisma/auditLogSchutz.ts),
  // auf einer Datenbank mit Protokolleinträgen bricht der Seed deshalb hier ab.
  await prisma.auditLog.deleteMany();
  await prisma.penaltyEntry.deleteMany({ where: { parentId: { not: null } } });
  await prisma.penaltyEntry.deleteMany();
  await prisma.cashTransaction.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.penaltyRule.deleteMany();
  await prisma.pollVote.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.user.updateMany({ data: { managedById: null } });
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  const team = await prisma.team.create({
    data: { name: "TSV Kronshagen 1. Herren (Demo)", joinCode: "DEMO26", isDemo: true },
  });
  const teamId = team.id;
  const trainer = await prisma.user.create({
    data: { teamId, name: "Jan Petersen", role: "TRAINER", phone: "0151 0000001" },
  });
  const cashier = await prisma.user.create({
    data: { teamId, name: "Karl Brandt", role: "CASHIER", phone: "0151 0000002", position: "Abwehr", shirtNumber: 4 },
  });
  const assistant = await prisma.user.create({
    data: { teamId, name: "Sven Kahl", role: "ASSISTANT", phone: "0151 0000003" },
  });
  const playerNames = [
    "Ben Albers",
    "Can Demir",
    "Finn Hansen",
    "Leon Jürgensen",
    "Luca Möller",
    "Noah Schmidt",
    "Paul Thomsen",
    "Tim Wagner",
  ];
  const positions = ["Tor", "Abwehr", "Mittelfeld", "Sturm", "Abwehr", "Mittelfeld", "Sturm", "Mittelfeld"];
  const players = [];
  for (const [i, name] of playerNames.entries()) {
    players.push(
      await prisma.user.create({
        data: { teamId, name, role: "PLAYER", position: positions[i], shirtNumber: i === 0 ? 1 : i + 5 },
      }),
    );
  }
  const [ben, can, finn, leon, luca, noah, paul, tim] = players;

  await prisma.penaltyRule.createMany({ data: STRAFENKATALOG.map((r) => ({ ...r, teamId })) });
  const absence = await prisma.penaltyRule.findUniqueOrThrow({ where: { teamId_position: { teamId, position: 8 } } });

  // Training vor zwei Wochen: Pauls Strafe ist überfällig (Frist abgelaufen), Tims Strafe per PayPal bezahlt
  const twoWeeksAgo = await prisma.trainingSession.create({
    data: {
      teamId,
      title: "Mannschaftstraining",
      startsAt: trainingAt(-14),
      responseDeadline: trainingAt(-15),
      location: "Kunstrasen Kronshagen",
      createdById: trainer.id,
    },
  });
  const oldAttendance = await Promise.all(
    players.map((p) =>
      prisma.attendance.create({
        data: { sessionId: twoWeeksAgo.id, userId: p.id, status: p === paul || p === tim ? "UNEXCUSED" : "ATTENDING" },
      }),
    ),
  );

  // Vergangenes Training: bereits abgeschlossen, eine Strafe offen, eine bezahlt
  const lastWeek = await prisma.trainingSession.create({
    data: {
      teamId,
      title: "Mannschaftstraining",
      startsAt: trainingAt(-7),
      responseDeadline: new Date(trainingAt(-8).getTime()),
      location: "Kunstrasen Kronshagen",
      createdById: trainer.id,
    },
  });
  await prisma.attendance.createMany({
    data: [
      { sessionId: lastWeek.id, userId: ben.id, status: "ATTENDING" },
      { sessionId: lastWeek.id, userId: can.id, status: "ATTENDING" },
      { sessionId: lastWeek.id, userId: finn.id, status: "EXCUSED", note: "Arbeit" },
      { sessionId: lastWeek.id, userId: leon.id, status: "UNEXCUSED" },
      { sessionId: lastWeek.id, userId: luca.id, status: "ATTENDING" },
      { sessionId: lastWeek.id, userId: noah.id, status: "UNEXCUSED" },
      { sessionId: lastWeek.id, userId: paul.id, status: "ATTENDING" },
      { sessionId: lastWeek.id, userId: tim.id, status: "ATTENDING" },
    ],
  });
  const lastWeekAttendance = await prisma.attendance.findMany({
    where: { sessionId: lastWeek.id, status: "UNEXCUSED" },
  });

  // Freigabe jeweils am Tag nach dem Training, Frist 7 Tage ab Freigabe
  const paulPenalty = await prisma.penaltyEntry.create({
    data: {
      teamId,
      playerId: paul.id,
      sessionId: twoWeeksAgo.id,
      ruleId: absence.id,
      amountCents: 2000,
      status: "OPEN",
      dueDate: trainingAt(-6),
      createdById: trainer.id,
    },
  });
  const timPenalty = await prisma.penaltyEntry.create({
    data: {
      teamId,
      playerId: tim.id,
      sessionId: twoWeeksAgo.id,
      ruleId: absence.id,
      amountCents: 2000,
      paidCents: 2000,
      status: "PAID_PAYPAL",
      method: "PAYPAL",
      dueDate: trainingAt(-6),
      createdById: trainer.id,
      updatedAt: trainingAt(-10),
    },
  });
  const leonPenalty = await prisma.penaltyEntry.create({
    data: {
      teamId,
      playerId: leon.id,
      sessionId: lastWeek.id,
      ruleId: absence.id,
      amountCents: 2000,
      status: "OPEN",
      dueDate: trainingAt(1),
      createdById: trainer.id,
    },
  });
  const noahPenalty = await prisma.penaltyEntry.create({
    data: {
      teamId,
      playerId: noah.id,
      sessionId: lastWeek.id,
      ruleId: absence.id,
      amountCents: 2000,
      paidCents: 2000,
      status: "PAID_CASH",
      method: "CASH",
      dueDate: trainingAt(1),
      createdById: trainer.id,
      updatedAt: trainingAt(-5),
    },
  });

  // Protokoll passend zu den Daten (MVP-6): Anwesenheit durch den Trainer, Vorschlag, Freigabe, Zahlung
  const at = (daysFromToday: number, hour: number) => {
    const d = trainingAt(daysFromToday);
    d.setHours(hour);
    return d;
  };
  await prisma.auditLog.createMany({
    data: [
      ...oldAttendance
        .filter((a) => a.status === "UNEXCUSED")
        .map((a) => ({
          teamId,
          attendanceId: a.id,
          actorId: trainer.id,
          action: "ANWESENHEIT_GESETZT",
          newAttendance: "UNEXCUSED" as const,
          createdAt: at(-14, 21),
        })),
      {
        teamId,
        entryId: paulPenalty.id,
        actorId: trainer.id,
        action: "VORGESCHLAGEN",
        newStatus: "PENDING_APPROVAL",
        createdAt: at(-14, 21),
      },
      {
        teamId,
        entryId: timPenalty.id,
        actorId: trainer.id,
        action: "VORGESCHLAGEN",
        newStatus: "PENDING_APPROVAL",
        createdAt: at(-14, 21),
      },
      {
        teamId,
        entryId: paulPenalty.id,
        actorId: trainer.id,
        action: "FREIGEGEBEN",
        oldStatus: "PENDING_APPROVAL",
        newStatus: "OPEN",
        createdAt: at(-13, 10),
      },
      {
        teamId,
        entryId: timPenalty.id,
        actorId: trainer.id,
        action: "FREIGEGEBEN",
        oldStatus: "PENDING_APPROVAL",
        newStatus: "OPEN",
        createdAt: at(-13, 10),
      },
      {
        teamId,
        entryId: timPenalty.id,
        actorId: cashier.id,
        action: "BEZAHLT",
        oldStatus: "OPEN",
        newStatus: "PAID_PAYPAL",
        note: "20,00 € per PayPal",
        createdAt: at(-10, 18),
      },
      ...lastWeekAttendance.map((a) => ({
        teamId,
        attendanceId: a.id,
        actorId: trainer.id,
        action: "ANWESENHEIT_GESETZT",
        newAttendance: "UNEXCUSED" as const,
        createdAt: at(-7, 21),
      })),
      {
        teamId,
        entryId: leonPenalty.id,
        actorId: trainer.id,
        action: "VORGESCHLAGEN",
        newStatus: "PENDING_APPROVAL",
        createdAt: at(-7, 21),
      },
      {
        teamId,
        entryId: noahPenalty.id,
        actorId: trainer.id,
        action: "VORGESCHLAGEN",
        newStatus: "PENDING_APPROVAL",
        createdAt: at(-7, 21),
      },
      {
        teamId,
        entryId: leonPenalty.id,
        actorId: trainer.id,
        action: "FREIGEGEBEN",
        oldStatus: "PENDING_APPROVAL",
        newStatus: "OPEN",
        createdAt: at(-6, 10),
      },
      {
        teamId,
        entryId: noahPenalty.id,
        actorId: trainer.id,
        action: "FREIGEGEBEN",
        oldStatus: "PENDING_APPROVAL",
        newStatus: "OPEN",
        createdAt: at(-6, 10),
      },
      {
        teamId,
        entryId: noahPenalty.id,
        actorId: cashier.id,
        action: "BEZAHLT",
        oldStatus: "OPEN",
        newStatus: "PAID_CASH",
        note: "20,00 € bar",
        createdAt: at(-5, 21),
      },
    ],
  });

  // Gestriges Training: Rückmeldungen da, Trainer hat die Anwesenheit noch nicht bestätigt (Demo-Ablauf)
  const yesterday = await prisma.trainingSession.create({
    data: {
      teamId,
      title: "Mannschaftstraining",
      startsAt: trainingAt(-1),
      responseDeadline: new Date(trainingAt(-2).getTime()),
      location: "Kunstrasen Kronshagen",
      createdById: trainer.id,
    },
  });
  await prisma.attendance.createMany({
    data: [
      { sessionId: yesterday.id, userId: ben.id, status: "ATTENDING" },
      { sessionId: yesterday.id, userId: can.id, status: "ATTENDING" },
      { sessionId: yesterday.id, userId: finn.id, status: "ATTENDING" },
      { sessionId: yesterday.id, userId: leon.id, status: "EXCUSED", note: "Knie" },
      { sessionId: yesterday.id, userId: luca.id, status: "UNSURE" },
      { sessionId: yesterday.id, userId: paul.id, status: "ATTENDING" },
      // Noah und Tim haben nicht geantwortet
    ],
  });

  // Kommende Trainings: Spieler können zu- oder absagen
  const nextTraining = await prisma.trainingSession.create({
    data: {
      teamId,
      title: "Mannschaftstraining",
      startsAt: trainingAt(1),
      responseDeadline: new Date(trainingAt(0).getTime() + 3 * HOUR),
      location: "Kunstrasen Kronshagen",
      createdById: trainer.id,
    },
  });
  await prisma.trainingSession.create({
    data: {
      teamId,
      title: "Mannschaftstraining",
      startsAt: trainingAt(3),
      responseDeadline: new Date(trainingAt(2).getTime() + 3 * HOUR),
      location: "Kunstrasen Kronshagen",
      createdById: trainer.id,
    },
  });
  await prisma.attendance.createMany({
    data: [
      { sessionId: nextTraining.id, userId: can.id, status: "ATTENDING" },
      { sessionId: nextTraining.id, userId: paul.id, status: "UNSURE" },
    ],
  });

  // Spiel am Wochenende mit Zusatzinfos (#47, #48) und eine Mannschaftsfeier
  const gameDay = trainingAt(4);
  gameDay.setHours(15, 0, 0, 0);
  const game = await prisma.trainingSession.create({
    data: {
      teamId,
      type: "GAME",
      title: "Punktspiel",
      opponent: "TSV Altenholz",
      startsAt: gameDay,
      responseDeadline: new Date(gameDay.getTime() - 2 * DAY),
      location: "Sportplatz Kronshagen, Platz 1",
      meetingPoint: "Kabine 2",
      meetingAt: new Date(gameDay.getTime() - 75 * 60 * 1000),
      tasks: "Bälle: Ben · Trikots waschen: Can",
      notes: "Bitte rotes Polo und Präsentationsanzug tragen.",
      createdById: trainer.id,
    },
  });
  await prisma.attendance.createMany({
    data: [
      { sessionId: game.id, userId: ben.id, status: "ATTENDING" },
      { sessionId: game.id, userId: can.id, status: "ATTENDING" },
      { sessionId: game.id, userId: finn.id, status: "ATTENDING" },
      { sessionId: game.id, userId: leon.id, status: "INJURED", note: "Knie" },
    ],
  });
  const partyDay = trainingAt(10);
  partyDay.setHours(20, 0, 0, 0);
  await prisma.trainingSession.create({
    data: {
      teamId,
      type: "PARTY",
      title: "Mannschaftsabend",
      startsAt: partyDay,
      responseDeadline: new Date(partyDay.getTime() - 3 * DAY),
      location: "Vereinsheim",
      createdById: assistant.id,
    },
  });

  // Neuigkeiten, Umfrage und Chat (#49, #50)
  await prisma.announcement.create({
    data: {
      teamId,
      authorId: trainer.id,
      title: "Willkommen bei SquadHQ",
      body: "Ab sofort laufen Zu- und Absagen, Strafen und die Teamkasse hier. Bitte bis Freitag für das Spiel zu- oder absagen.",
      pinned: true,
    },
  });
  await prisma.poll.create({
    data: {
      teamId,
      createdById: assistant.id,
      question: "Was essen wir beim Mannschaftsabend?",
      closesAt: new Date(partyDay.getTime() - 4 * DAY),
      options: {
        create: [
          { text: "Pizza", order: 0, votes: { create: [{ userId: ben.id }, { userId: can.id }, { userId: luca.id }] } },
          { text: "Burger", order: 1, votes: { create: [{ userId: finn.id }] } },
          { text: "Grillen", order: 2 },
        ],
      },
    },
  });
  await prisma.chatMessage.createMany({
    data: [
      { teamId, authorId: can.id, body: "Wer bringt am Samstag die Bälle mit?", createdAt: at(-1, 20) },
      { teamId, authorId: ben.id, body: "Mach ich!", createdAt: at(-1, 21) },
    ],
  });

  // Kassenbuch (#53): Ausgabe für Getränke
  const drinks = await prisma.cashTransaction.create({
    data: {
      teamId,
      direction: "EXPENSE",
      amountCents: 1800,
      description: "Getränke nach dem Heimspiel",
      bookedAt: at(-6, 20),
      createdById: cashier.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      teamId,
      transactionId: drinks.id,
      actorId: cashier.id,
      action: "AUSGABE",
      note: "18,00 € · Getränke nach dem Heimspiel",
      createdAt: at(-6, 20),
    },
  });

  // Testkonten mit E-Mail und Passwort (README), nur wenn Supabase Auth da ist
  await testkontenAnlegen(prisma, [
    { userId: trainer.id, email: TESTKONTEN.trainer },
    { userId: paul.id, email: TESTKONTEN.spieler },
    { userId: cashier.id, email: TESTKONTEN.kassenwart },
  ]);

  console.log(
    `Seed fertig: Demo-Team mit ${players.length} Spielern, Trainer, Betreuer, Kassenwart, 7 Terminen, ${STRAFENKATALOG.length} Katalogregeln.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
