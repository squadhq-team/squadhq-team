/**
 * Demo-Daten für den Prototyp (P3).
 * Strafenkatalog: Pos. 8 (20 € unentschuldigtes Fehlen) und die Mahngebühr (5 € pro Woche) stammen aus dem
 * TSVK-Strafenkatalog 2026/27. Die Verspätungsstaffeln sind Platzhalter und müssen mit dem Katalog abgeglichen werden.
 * Personen sind erfunden.
 */
import { PrismaClient } from "@prisma/client";

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
  await prisma.auditLog.deleteMany();
  await prisma.penaltyEntry.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.penaltyRule.deleteMany();
  await prisma.user.deleteMany();

  const trainer = await prisma.user.create({ data: { name: "Jan Petersen", role: "TRAINER", phone: "0151 0000001" } });
  const playerNames = ["Ben Albers", "Can Demir", "Finn Hansen", "Leon Jürgensen", "Luca Möller", "Noah Schmidt", "Paul Thomsen", "Tim Wagner"];
  const players = [];
  for (const name of playerNames) {
    players.push(await prisma.user.create({ data: { name, role: "PLAYER" } }));
  }
  const [ben, can, finn, leon, luca, noah, paul, tim] = players;

  const absence = await prisma.penaltyRule.create({
    data: { position: 8, title: "Unentschuldigtes Fehlen beim Training", amountCents: 2000, trigger: "UNEXCUSED_ABSENCE" },
  });
  await prisma.penaltyRule.createMany({
    data: [
      { title: "Verspätung Training bis 15 Minuten (Platzhalter)", amountCents: 200, trigger: "LATE" },
      { title: "Verspätung Training über 15 Minuten (Platzhalter)", amountCents: 500, trigger: "LATE" },
      { title: "Mahngebühr je angefangene Woche Zahlungsverzug", amountCents: 500, trigger: "MANUAL" },
    ],
  });

  // Vergangenes Training: bereits abgeschlossen, eine Strafe offen, eine bezahlt
  const lastWeek = await prisma.trainingSession.create({
    data: { title: "Mannschaftstraining", startsAt: trainingAt(-7), responseDeadline: new Date(trainingAt(-8).getTime()), location: "Kunstrasen Kronshagen", createdById: trainer.id },
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
  const leonPenalty = await prisma.penaltyEntry.create({
    data: { playerId: leon.id, sessionId: lastWeek.id, ruleId: absence.id, amountCents: 2000, status: "OPEN", dueDate: trainingAt(0), createdById: trainer.id },
  });
  const noahPenalty = await prisma.penaltyEntry.create({
    data: { playerId: noah.id, sessionId: lastWeek.id, ruleId: absence.id, amountCents: 2000, paidCents: 2000, status: "PAID_CASH", createdById: trainer.id },
  });
  await prisma.auditLog.createMany({
    data: [
      { entryId: leonPenalty.id, actorId: trainer.id, action: "VORGESCHLAGEN", newStatus: "PENDING_APPROVAL" },
      { entryId: leonPenalty.id, actorId: trainer.id, action: "FREIGEGEBEN", oldStatus: "PENDING_APPROVAL", newStatus: "OPEN" },
      { entryId: noahPenalty.id, actorId: trainer.id, action: "VORGESCHLAGEN", newStatus: "PENDING_APPROVAL" },
      { entryId: noahPenalty.id, actorId: trainer.id, action: "FREIGEGEBEN", oldStatus: "PENDING_APPROVAL", newStatus: "OPEN" },
    ],
  });

  // Gestriges Training: Rückmeldungen da, Trainer hat die Anwesenheit noch nicht bestätigt (Demo-Ablauf)
  const yesterday = await prisma.trainingSession.create({
    data: { title: "Mannschaftstraining", startsAt: trainingAt(-1), responseDeadline: new Date(trainingAt(-2).getTime()), location: "Kunstrasen Kronshagen", createdById: trainer.id },
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
    data: { title: "Mannschaftstraining", startsAt: trainingAt(1), responseDeadline: new Date(trainingAt(0).getTime() + 3 * HOUR), location: "Kunstrasen Kronshagen", createdById: trainer.id },
  });
  await prisma.trainingSession.create({
    data: { title: "Mannschaftstraining", startsAt: trainingAt(3), responseDeadline: new Date(trainingAt(2).getTime() + 3 * HOUR), location: "Kunstrasen Kronshagen", createdById: trainer.id },
  });
  await prisma.attendance.createMany({
    data: [
      { sessionId: nextTraining.id, userId: can.id, status: "ATTENDING" },
      { sessionId: nextTraining.id, userId: paul.id, status: "UNSURE" },
    ],
  });

  console.log(`Seed fertig: ${players.length} Spieler, 1 Trainer, 4 Trainings, 4 Katalogregeln.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
