/**
 * NewsService: Neuigkeiten & Ankündigungen (#49), Umfragen (#50) und Team-Chat.
 * Alles nur innerhalb eines Teams.
 */
import { prisma } from "@/lib/db";

/* ---------- Ankündigungen (#49) ---------- */

export async function createAnnouncement(params: {
  teamId: string;
  authorId: string;
  title: string;
  body: string;
  pinned: boolean;
}) {
  const title = params.title.trim();
  const body = params.body.trim();
  if (title.length < 2) throw new Error("Bitte einen Titel angeben.");
  if (body.length < 2) throw new Error("Bitte einen Text schreiben.");
  if (body.length > 4000) throw new Error("Der Text ist zu lang (höchstens 4000 Zeichen).");
  return prisma.announcement.create({
    data: { teamId: params.teamId, authorId: params.authorId, title, body, pinned: params.pinned },
  });
}

/** Ankündigungen, angeheftete zuerst, dann neueste. */
export function listAnnouncements(teamId: string, take = 20) {
  return prisma.announcement.findMany({
    where: { teamId },
    include: { author: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take,
  });
}

/** Löschen darf, wer sie geschrieben hat, oder ein Trainer. */
export async function deleteAnnouncement(params: { teamId: string; id: string; userId: string; isTrainer: boolean }) {
  const a = await prisma.announcement.findFirst({ where: { id: params.id, teamId: params.teamId } });
  if (!a) throw new Error("Diese Ankündigung gibt es nicht.");
  if (a.authorId !== params.userId && !params.isTrainer)
    throw new Error("Nur wer sie geschrieben hat, kann sie löschen.");
  await prisma.announcement.delete({ where: { id: a.id } });
}

/* ---------- Umfragen (#50) ---------- */

export async function createPoll(params: {
  teamId: string;
  createdById: string;
  question: string;
  options: string[];
  multiple: boolean;
  closesAt?: Date;
}) {
  const question = params.question.trim();
  const options = [...new Set(params.options.map((o) => o.trim()).filter(Boolean))];
  if (question.length < 3) throw new Error("Bitte eine Frage stellen.");
  if (options.length < 2) throw new Error("Bitte mindestens zwei verschiedene Antworten angeben.");
  if (options.length > 10) throw new Error("Höchstens 10 Antworten.");
  const closesAt = params.closesAt && !Number.isNaN(params.closesAt.getTime()) ? params.closesAt : null;
  if (closesAt && closesAt < new Date()) throw new Error("Das Ende der Umfrage muss in der Zukunft liegen.");
  return prisma.poll.create({
    data: {
      teamId: params.teamId,
      createdById: params.createdById,
      question,
      multiple: params.multiple,
      closesAt,
      options: { create: options.map((text, order) => ({ text, order })) },
    },
  });
}

export const isPollOpen = (p: { closesAt: Date | null; closedAt: Date | null }, now = new Date()) =>
  !p.closedAt && (!p.closesAt || p.closesAt > now);

/** Umfragen mit Antworten und Stimmen (wer hat was gewählt, für alle sichtbar). Offene zuerst. */
export async function listPolls(teamId: string, take = 20) {
  const polls = await prisma.poll.findMany({
    where: { teamId },
    include: {
      createdBy: true,
      options: { orderBy: { order: "asc" }, include: { votes: { include: { user: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  return polls.sort((a, b) => Number(isPollOpen(b)) - Number(isPollOpen(a)));
}

/** Abstimmen mit einem Klick. Einfachauswahl: ersetzt die bisherige Stimme. Mehrfachauswahl: Stimme an/aus. */
export async function vote(params: { teamId: string; userId: string; optionId: string }) {
  const option = await prisma.pollOption.findFirst({
    where: { id: params.optionId, poll: { teamId: params.teamId } },
    include: { poll: { include: { options: true } } },
  });
  if (!option) throw new Error("Diese Antwort gibt es nicht.");
  if (!isPollOpen(option.poll)) throw new Error("Die Umfrage ist beendet.");
  const key = { optionId_userId: { optionId: option.id, userId: params.userId } };
  const existing = await prisma.pollVote.findUnique({ where: key });
  await prisma.$transaction(async (tx) => {
    if (option.poll.multiple) {
      if (existing) await tx.pollVote.delete({ where: { id: existing.id } });
      else await tx.pollVote.create({ data: { optionId: option.id, userId: params.userId } });
      return;
    }
    await tx.pollVote.deleteMany({
      where: { userId: params.userId, optionId: { in: option.poll.options.map((o) => o.id) } },
    });
    if (!existing) await tx.pollVote.create({ data: { optionId: option.id, userId: params.userId } });
  });
}

export async function closePoll(params: { teamId: string; pollId: string }) {
  const poll = await prisma.poll.findFirst({ where: { id: params.pollId, teamId: params.teamId } });
  if (!poll) throw new Error("Diese Umfrage gibt es nicht.");
  await prisma.poll.update({ where: { id: poll.id }, data: { closedAt: new Date() } });
}

/* ---------- Team-Chat ---------- */

export async function postMessage(params: { teamId: string; authorId: string; body: string }) {
  const body = params.body.trim();
  if (!body) throw new Error("Bitte eine Nachricht schreiben.");
  if (body.length > 2000) throw new Error("Die Nachricht ist zu lang (höchstens 2000 Zeichen).");
  return prisma.chatMessage.create({ data: { teamId: params.teamId, authorId: params.authorId, body } });
}

/** Die letzten Nachrichten, älteste oben (wie in jedem Messenger). */
export async function listMessages(teamId: string, take = 100) {
  const messages = await prisma.chatMessage.findMany({
    where: { teamId },
    include: { author: true },
    orderBy: { createdAt: "desc" },
    take,
  });
  return messages.reverse();
}

/** Eigene Nachricht löschen. */
export async function deleteMessage(params: { teamId: string; id: string; userId: string }) {
  const m = await prisma.chatMessage.findFirst({
    where: { id: params.id, teamId: params.teamId, authorId: params.userId },
  });
  if (!m) throw new Error("Nur eigene Nachrichten lassen sich löschen.");
  await prisma.chatMessage.delete({ where: { id: m.id } });
}
