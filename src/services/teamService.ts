/**
 * TeamService: Team gründen, mit Team-Code beitreten, Mitglieder und Rollen verwalten, Profil, Konto löschen (REQ-SEC-01, #51).
 * Jedes Team ist von anderen getrennt; alle Funktionen prüfen, dass Personen zum selben Team gehören.
 */
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SQUAD_ROLES, generateJoinCode, normalizeJoinCode, roleChangeProblem } from "@/domain/permissions";
import { STRAFENKATALOG } from "../../prisma/strafenkatalog";
import { logMemberChange } from "./auditService";

/** Freien Team-Code finden (bei Kollision neu würfeln). */
async function freeJoinCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateJoinCode();
    if (!(await prisma.team.findUnique({ where: { joinCode: code } }))) return code;
  }
  throw new Error("Es konnte kein Team-Code erzeugt werden. Bitte noch einmal versuchen.");
}

/** Neues Team gründen: wer gründet, wird Trainer. Das Team startet mit dem TSVK-Strafenkatalog als Vorlage. */
export async function createTeam(userId: string, name: string) {
  const teamName = name.trim();
  if (teamName.length < 3) throw new Error("Bitte einen Teamnamen mit mindestens 3 Zeichen angeben.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.teamId) throw new Error("Du bist schon in einem Team. Tritt zuerst aus, um ein neues zu gründen.");
  const joinCode = await freeJoinCode();
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.create({ data: { name: teamName, joinCode } });
    await tx.penaltyRule.createMany({
      data: STRAFENKATALOG.map((r) => ({ ...r, active: r.active ?? true, teamId: team.id })),
    });
    await tx.user.update({ where: { id: userId }, data: { teamId: team.id, role: "TRAINER" } });
    await logMemberChange(tx, {
      teamId: team.id,
      subjectId: userId,
      actorId: userId,
      action: "BEIGETRETEN",
      note: "Team gegründet, Rolle Trainer",
    });
    return team;
  });
}

/** Mit Team-Code beitreten: neue Mitglieder sind Spieler. Das Demo-Team ist nicht beitretbar. */
export async function joinTeam(userId: string, code: string) {
  const joinCode = normalizeJoinCode(code);
  if (!joinCode) throw new Error("Bitte den Team-Code eingeben.");
  const team = await prisma.team.findUnique({ where: { joinCode } });
  if (!team || team.isDemo) throw new Error("Diesen Team-Code gibt es nicht. Bitte beim Trainer nachfragen.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.teamId === team.id) return team;
  if (user.teamId) throw new Error("Du bist schon in einem Team. Tritt zuerst aus.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { teamId: team.id, role: "PLAYER" } });
    await logMemberChange(tx, { teamId: team.id, subjectId: userId, actorId: userId, action: "BEIGETRETEN" });
  });
  return team;
}

/** Trainer erzeugt einen neuen Team-Code (der alte gilt dann nicht mehr). */
export async function regenerateJoinCode(teamId: string) {
  return prisma.team.update({ where: { id: teamId }, data: { joinCode: await freeJoinCode() } });
}

export async function renameTeam(teamId: string, name: string) {
  if (name.trim().length < 3) throw new Error("Bitte einen Teamnamen mit mindestens 3 Zeichen angeben.");
  return prisma.team.update({ where: { id: teamId }, data: { name: name.trim() } });
}

/** Alle aktiven Mitglieder eines Teams, sortiert nach Rolle und Name, mit Stellvertretung. */
export function listMembers(teamId: string) {
  return prisma.user.findMany({
    where: { teamId, deletedAt: null },
    include: { managedBy: true, managed: { where: { teamId, deletedAt: null } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

/** Kader: wer zu- und absagt und Strafen bekommen kann (Spieler und Kassenwart). */
export function listSquad(teamId: string) {
  return prisma.user.findMany({
    where: { teamId, deletedAt: null, role: { in: SQUAD_ROLES } },
    orderBy: { name: "asc" },
  });
}

/** Ein Mitglied des eigenen Teams laden oder Fehler werfen (schützt vor Zugriffen auf andere Teams). */
export async function getTeamMember(teamId: string, userId: string): Promise<User> {
  const user = await prisma.user.findFirst({ where: { id: userId, teamId, deletedAt: null } });
  if (!user) throw new Error("Dieses Mitglied gehört nicht zu deinem Team.");
  return user;
}

/** Trainer vergibt eine Rolle. Das Team behält immer mindestens einen Trainer. Wird protokolliert. */
export async function changeRole(params: { teamId: string; actorId: string; userId: string; role: Role }) {
  const target = await getTeamMember(params.teamId, params.userId);
  if (target.role === params.role) return;
  const trainerCount = await prisma.user.count({
    where: { teamId: params.teamId, role: "TRAINER", deletedAt: null },
  });
  const problem = roleChangeProblem({ target, newRole: params.role, trainerCount });
  if (problem) throw new Error(problem);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { role: params.role } });
    await logMemberChange(tx, {
      teamId: params.teamId,
      subjectId: target.id,
      actorId: params.actorId,
      action: "ROLLE_GEAENDERT",
      note: `${target.role} → ${params.role}`,
    });
  });
}

/** Trainer entfernt ein Mitglied aus dem Team. Strafen und Protokoll bleiben erhalten. */
export async function removeMember(params: { teamId: string; actorId: string; userId: string }) {
  const target = await getTeamMember(params.teamId, params.userId);
  if (target.id === params.actorId) throw new Error("Um selbst auszutreten, nutze „Team verlassen“ im Profil.");
  if (target.role === "TRAINER") {
    const trainers = await prisma.user.count({ where: { teamId: params.teamId, role: "TRAINER", deletedAt: null } });
    if (trainers <= 1) throw new Error("Das Team braucht mindestens einen Trainer.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { teamId: null, managedById: null } });
    await tx.user.updateMany({ where: { managedById: target.id }, data: { managedById: null } });
    await logMemberChange(tx, {
      teamId: params.teamId,
      subjectId: target.id,
      actorId: params.actorId,
      action: "MITGLIED_ENTFERNT",
    });
  });
}

/** Mitglied verlässt das Team selbst. Der letzte Trainer kann erst gehen, wenn es einen anderen Trainer gibt. */
export async function leaveTeam(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.teamId) return;
  const others = await prisma.user.count({
    where: { teamId: user.teamId, deletedAt: null, id: { not: userId } },
  });
  if (user.role === "TRAINER" && others > 0) {
    const trainers = await prisma.user.count({ where: { teamId: user.teamId, role: "TRAINER", deletedAt: null } });
    if (trainers <= 1) throw new Error("Du bist der einzige Trainer. Gib zuerst jemand anderem die Rolle Trainer.");
  }
  const teamId = user.teamId;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { teamId: null, managedById: null } });
    await tx.user.updateMany({ where: { managedById: userId }, data: { managedById: null } });
    await logMemberChange(tx, {
      teamId,
      subjectId: userId,
      actorId: userId,
      action: "MITGLIED_ENTFERNT",
      note: "selbst ausgetreten",
    });
  });
}

/**
 * Trainer legt ein Mitglied ohne eigenes Konto an (z. B. Jugendspieler oder jemand ohne Smartphone).
 * Optional mit Stellvertreter (Elternteil), der für das Mitglied zu- und absagt.
 */
export async function addMemberWithoutAccount(params: {
  teamId: string;
  actorId: string;
  name: string;
  managedById?: string;
}) {
  const name = params.name.trim();
  if (name.length < 2) throw new Error("Bitte einen Namen angeben.");
  if (params.managedById) await getTeamMember(params.teamId, params.managedById);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, role: "PLAYER", teamId: params.teamId, managedById: params.managedById || null },
    });
    await logMemberChange(tx, {
      teamId: params.teamId,
      subjectId: user.id,
      actorId: params.actorId,
      action: "BEIGETRETEN",
      note: "ohne eigenes Konto angelegt",
    });
    return user;
  });
}

/** Trainer setzt oder entfernt den Stellvertreter (z. B. Elternteil) eines Mitglieds. */
export async function setGuardian(params: { teamId: string; userId: string; managedById: string | null }) {
  const member = await getTeamMember(params.teamId, params.userId);
  if (params.managedById) {
    if (params.managedById === member.id) throw new Error("Ein Mitglied kann nicht sein eigener Stellvertreter sein.");
    await getTeamMember(params.teamId, params.managedById);
  }
  await prisma.user.update({ where: { id: member.id }, data: { managedById: params.managedById } });
}

/** Eigenes Profil bearbeiten (#51). */
export async function updateProfile(
  userId: string,
  data: { name: string; phone: string; position: string; shirtNumber: string },
) {
  const name = data.name.trim();
  if (name.length < 2) throw new Error("Bitte deinen Namen angeben.");
  const nr = data.shirtNumber.trim();
  const shirtNumber = nr ? Number(nr) : null;
  if (shirtNumber !== null && (!Number.isInteger(shirtNumber) || shirtNumber < 1 || shirtNumber > 99))
    throw new Error("Die Rückennummer muss zwischen 1 und 99 liegen.");
  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      phone: data.phone.trim() || null,
      position: data.position.trim() || null,
      shirtNumber,
    },
  });
}

/**
 * Konto löschen (Datenschutz): Name, Kontaktdaten und Anmeldung werden entfernt, das Mitglied verlässt das Team.
 * Strafen und Protokoll bleiben als „Gelöschtes Mitglied“ erhalten, damit die Kasse nachvollziehbar bleibt.
 * Das Konto bei Supabase Auth wird direkt in der Datenbank gelöscht (auth.users); lokal ohne Supabase wird das übersprungen.
 */
export async function deleteAccount(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.teamId && user.role === "TRAINER") {
    const others = await prisma.user.count({ where: { teamId: user.teamId, deletedAt: null, id: { not: userId } } });
    const trainers = await prisma.user.count({ where: { teamId: user.teamId, role: "TRAINER", deletedAt: null } });
    if (others > 0 && trainers <= 1)
      throw new Error("Du bist der einzige Trainer. Gib zuerst jemand anderem die Rolle Trainer.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { managedById: userId }, data: { managedById: null } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        name: "Gelöschtes Mitglied",
        email: null,
        phone: null,
        position: null,
        shirtNumber: null,
        authId: null,
        passwordHash: null,
        managedById: null,
        teamId: null,
        deletedAt: new Date(),
      },
    });
    if (user.teamId)
      await logMemberChange(tx, { teamId: user.teamId, subjectId: userId, actorId: null, action: "KONTO_GELOESCHT" });
  });
  if (user.authId) {
    try {
      await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${user.authId}::uuid`;
    } catch (e) {
      console.error("Supabase-Konto konnte nicht gelöscht werden (lokal ohne Supabase normal):", e);
    }
  }
}

/** Name des Teams für die Kopfzeile. */
export async function getTeamName(teamId: string) {
  return (await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } }))?.name ?? null;
}

/**
 * Für wen sagt diese Person zu oder ab? Sich selbst (wenn im Kader) und alle Mitglieder,
 * für die sie als Stellvertreter (z. B. Elternteil) eingetragen ist.
 */
export async function listRespondents(user: User): Promise<User[]> {
  if (!user.teamId) return [];
  const managed = await prisma.user.findMany({
    where: { teamId: user.teamId, managedById: user.id, deletedAt: null, role: { in: SQUAD_ROLES } },
    orderBy: { name: "asc" },
  });
  return [...(SQUAD_ROLES.includes(user.role) ? [user] : []), ...managed];
}
