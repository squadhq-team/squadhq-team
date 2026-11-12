/**
 * Testhilfe für DB-Tests: legt ein eigenes Team mit Strafenkatalog (Vorlage TSVK) und Personen an.
 * Jede Testdatei bekommt so ihr eigenes Team, Tests laufen getrennt voneinander (auch parallel, vgl. D-01).
 */
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { STRAFENKATALOG } from "../../prisma/strafenkatalog";

export async function createTestTeam(name: string, people: Record<string, Role> = {}) {
  const team = await prisma.team.create({
    data: { name, joinCode: `T${Math.random().toString(36).slice(2, 10).toUpperCase()}` },
  });
  await prisma.penaltyRule.createMany({
    data: STRAFENKATALOG.map((r) => ({ ...r, active: r.active ?? true, teamId: team.id })),
  });
  const users: Record<string, string> = {};
  for (const [key, role] of Object.entries(people)) {
    users[key] = (await prisma.user.create({ data: { name: `${name} ${key}`, role, teamId: team.id } })).id;
  }
  return { teamId: team.id, joinCode: team.joinCode, users };
}

export async function createPastSession(
  teamId: string,
  createdById: string,
  type: "TRAINING" | "GAME" | "PARTY" = "TRAINING",
) {
  return prisma.trainingSession.create({
    data: {
      teamId,
      type,
      title: `Test ${type}`,
      startsAt: new Date(Date.now() - 86_400_000),
      responseDeadline: new Date(Date.now() - 2 * 86_400_000),
      createdById,
    },
  });
}
