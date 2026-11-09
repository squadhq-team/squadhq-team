/**
 * Demo-Daten für die Präsentationen (Stand P4). Alle Zeiten relativ zum Ladetag, deshalb am Vortag `npm run db:reset`.
 * Strafenkatalog: vollständiger TSVK-Strafenkatalog 2026/27 aus prisma/strafenkatalog.ts
 * (Quelle: docs/anforderungen/strafenkatalog-tsvk-2026-27.md).
 * Personen sind erfunden.
 */
import { PrismaClient } from "@prisma/client";
import { STRAFENKATALOG } from "./strafenkatalog";

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
  await prisma.penaltyEntry.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.penaltyRule.deleteMany();
  await prisma.user.deleteMany();

  const trainer = await prisma.user.create({ data: { name: "Jan Petersen", role: "TRAINER", phone: "0151 0000001" } });
  const cashier = await prisma.user.create({ data: { name: "Karl Brandt", role: "CASHIER", phone: "0151 0000002" } });
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
  const players = [];
  for (const name of playerNames) {
    players.push(await prisma.user.create({ data: { name, role: "PLAYER" } }));
  }
  const [ben, can, finn, leon, luca, noah, paul, tim] = players;

  await prisma.penaltyRule.createMany({ data: STRAFENKATALOG });
  const absence = await prisma.penaltyRule.findUniqueOrThrow({ where: { position: 8 } });

  // Training vor zwei Wochen: Pauls Strafe ist überfällig (Frist abgelaufen), Tims Strafe per PayPal bezahlt
  const twoWeeksAgo = await prisma.trainingSession.create({
    data: {
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
          attendanceId: a.id,
          actorId: trainer.id,
          action: "ANWESENHEIT_GESETZT",
          newAttendance: "UNEXCUSED" as const,
          createdAt: at(-14, 21),
        })),
      {
        entryId: paulPenalty.id,
        actorId: trainer.id,
        action: "VORGESCHLAGEN",
        newStatus: "PENDING_APPROVAL",
        createdAt: at(-14, 21),
      },
      {
        entryId: timPenalty.id,
        actorId: trainer.id,
        action: "VORGESCHLAGEN",
        newStatus: "PENDING_APPROVAL",
        createdAt: at(-14, 21),
      },
      {
        entryId: paulPenalty.id,
        actorId: trainer.id,
        action: "FREIGEGEBEN",
        oldStatus: "PENDING_APPROVAL",
        newStatus: "OPEN",
        createdAt: at(-13, 10),
      },
      {
        entryId: timPenalty.id,
        actorId: trainer.id,
        action: "FREIGEGEBEN",
        oldStatus: "PENDING_APPROVAL",
        newStatus: "OPEN",
        createdAt: at(-13, 10),
      },
      {
        entryId: timPenalty.id,
        actorId: cashier.id,
        action: "BEZAHLT",
        oldStatus: "OPEN",
        newStatus: "PAID_PAYPAL",
        note: "20,00 € per PayPal",
        createdAt: at(-10, 18),
      },
      ...lastWeekAttendance.map((a) => ({
        attendanceId: a.id,
        actorId: trainer.id,
        action: "ANWESENHEIT_GESETZT",
        newAttendance: "UNEXCUSED" as const,
        createdAt: at(-7, 21),
      })),
      {
        entryId: leonPenalty.id,
        actorId: trainer.id,
        action: "VORGESCHLAGEN",
        newStatus: "PENDING_APPROVAL",
        createdAt: at(-7, 21),
      },
      {
        entryId: noahPenalty.id,
        actorId: trainer.id,
        action: "VORGESCHLAGEN",
        newStatus: "PENDING_APPROVAL",
        createdAt: at(-7, 21),
      },
      {
        entryId: leonPenalty.id,
        actorId: trainer.id,
        action: "FREIGEGEBEN",
        oldStatus: "PENDING_APPROVAL",
        newStatus: "OPEN",
        createdAt: at(-6, 10),
      },
      {
        entryId: noahPenalty.id,
        actorId: trainer.id,
        action: "FREIGEGEBEN",
        oldStatus: "PENDING_APPROVAL",
        newStatus: "OPEN",
        createdAt: at(-6, 10),
      },
      {
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
      title: "Mannschaftstraining",
      startsAt: trainingAt(1),
      responseDeadline: new Date(trainingAt(0).getTime() + 3 * HOUR),
      location: "Kunstrasen Kronshagen",
      createdById: trainer.id,
    },
  });
  await prisma.trainingSession.create({
    data: {
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

  console.log(
    `Seed fertig: ${players.length} Spieler, 1 Trainer, 1 Kassenwart, 5 Trainings, ${STRAFENKATALOG.length} Katalogregeln.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
