/**
 * RatingService: Leistungsbewertung nach dem Training (#65).
 * Trainer und Betreuer geben jedem anwesenden Spieler 1–5 Sterne und optional eine Notiz.
 * Sichtbarkeit (mayViewRatingsOf): Trainer/Betreuer sehen alle, ein Spieler nur seine eigenen,
 * ein Stellvertreter die seines Mitglieds. Jede Lesefunktion prüft das hier, nicht erst die Seite.
 */
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { can, mayViewRatingsOf, SQUAD_ROLES } from "@/domain/permissions";
import { ratingProblem, ratingSummary } from "@/domain/statistics";
import { getSession } from "./attendanceService";
import { listRespondents, listSquad } from "./teamService";

type Viewer = Pick<User, "id" | "role" | "teamId">;

/**
 * Spieler bewerten (oder Bewertung ändern). Nur für Trainer/Betreuer, nur nach einem stattgefundenen Training
 * und nur für Spieler, die laut Anwesenheit dabei waren.
 */
export async function ratePlayer(params: {
  teamId: string;
  rater: Pick<User, "id" | "role">;
  sessionId: string;
  playerId: string;
  stars: number;
  note?: string | null;
}) {
  if (!can(params.rater.role, "spieler.bewerten")) throw new Error("Bewerten dürfen nur Trainer und Betreuer.");
  const session = await getSession(params.teamId, params.sessionId);
  const player = await prisma.user.findFirst({
    where: { id: params.playerId, teamId: params.teamId, deletedAt: null, role: { in: SQUAD_ROLES } },
  });
  if (!player) throw new Error("Dieses Mitglied gehört nicht zu deinem Team.");
  const attendance = await prisma.attendance.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId: player.id } },
  });
  const problem = ratingProblem({
    eventType: session.type,
    startsAt: session.startsAt,
    cancelledAt: session.cancelledAt,
    attendance: attendance?.status ?? null,
    stars: params.stars,
    note: params.note,
  });
  if (problem) throw new Error(problem);
  const note = params.note?.trim() || null;
  return prisma.playerRating.upsert({
    where: { sessionId_playerId: { sessionId: session.id, playerId: player.id } },
    create: {
      teamId: params.teamId,
      sessionId: session.id,
      playerId: player.id,
      raterId: params.rater.id,
      stars: params.stars,
      note,
    },
    update: { raterId: params.rater.id, stars: params.stars, note },
  });
}

/** Bewertung zurücknehmen (z. B. versehentlich vergeben). Nur Trainer/Betreuer. */
export async function removeRating(params: {
  teamId: string;
  rater: Pick<User, "role">;
  sessionId: string;
  playerId: string;
}) {
  if (!can(params.rater.role, "spieler.bewerten")) throw new Error("Bewerten dürfen nur Trainer und Betreuer.");
  await prisma.playerRating.deleteMany({
    where: { teamId: params.teamId, sessionId: params.sessionId, playerId: params.playerId },
  });
}

/**
 * Bewertungen eines Trainings, die `viewer` sehen darf: Trainer/Betreuer alle, sonst nur die eigene
 * und die der Mitglieder, für die er Stellvertreter ist.
 */
export async function listVisibleRatingsForSession(viewer: User, sessionId: string) {
  if (!viewer.teamId) return [];
  const all = can(viewer.role, "spieler.bewerten");
  const ids = all ? undefined : (await listRespondents(viewer)).map((r) => r.id);
  return prisma.playerRating.findMany({
    where: { teamId: viewer.teamId, sessionId, ...(ids ? { playerId: { in: ids } } : {}) },
    include: { player: true },
  });
}

/**
 * Übersicht Leistung für die Statistik-Seite: je sichtbarem Spieler Schnitt, Trend und Anzahl der Bewertungen.
 * Trainer/Betreuer bekommen den ganzen Kader, Spieler nur sich selbst (und ggf. ihre Mitglieder als Stellvertreter).
 */
export async function getRatingOverview(viewer: User & { teamId: string }) {
  const all = can(viewer.role, "spieler.bewerten");
  const members = all ? await listSquad(viewer.teamId) : await listRespondents(viewer);
  const ratings = await prisma.playerRating.findMany({
    where: { teamId: viewer.teamId, playerId: { in: members.map((m) => m.id) } },
    include: { session: { select: { startsAt: true } } },
  });
  return {
    seesAll: all,
    rows: members
      .map((member) => ({
        member,
        ...ratingSummary(
          ratings.filter((r) => r.playerId === member.id).map((r) => ({ stars: r.stars, at: r.session.startsAt })),
        ),
      }))
      .sort((a, b) => (b.average ?? -1) - (a.average ?? -1) || a.member.name.localeCompare(b.member.name)),
  };
}

/**
 * Alle Bewertungen eines Spielers mit Notizen (neueste zuerst) und Zusammenfassung.
 * Wirft einen Fehler, wenn `viewer` sie nicht sehen darf, damit fremde Bewertungen auch über eine direkte Adresse
 * nicht erreichbar sind.
 */
export async function getPlayerRatings(viewer: Viewer & { teamId: string }, playerId: string) {
  const player = await prisma.user.findFirst({ where: { id: playerId, teamId: viewer.teamId, deletedAt: null } });
  if (!player || !mayViewRatingsOf(viewer, player)) throw new Error("Diese Bewertungen kannst du nicht sehen.");
  const ratings = await prisma.playerRating.findMany({
    where: { teamId: viewer.teamId, playerId },
    include: { session: true, rater: true },
    orderBy: { session: { startsAt: "desc" } },
  });
  return {
    player,
    ratings,
    ...ratingSummary(ratings.map((r) => ({ stars: r.stars, at: r.session.startsAt }))),
  };
}
