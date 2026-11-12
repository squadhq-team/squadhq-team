"use server";
/** Server Actions der Teamverwaltung (REQ-SEC-01, #51): Rollen, Team-Code, Mitglieder, Stellvertreter. */
import type { Role } from "@prisma/client";
import { assertMember } from "@/lib/auth";
import { handle, text } from "@/lib/actionUtils";
import {
  addMemberWithoutAccount,
  changeRole,
  regenerateJoinCode,
  removeMember,
  renameTeam,
  setGuardian,
} from "@/services/teamService";

const ROLES: Role[] = ["TRAINER", "ASSISTANT", "CASHIER", "PLAYER", "GUARDIAN"];

export async function changeRoleAction(formData: FormData) {
  await handle(formData, "/team", async () => {
    const user = await assertMember("team.verwalten");
    const role = text(formData, "role") as Role;
    if (!ROLES.includes(role)) throw new Error("Unbekannte Rolle.");
    await changeRole({ teamId: user.teamId, actorId: user.id, userId: text(formData, "userId"), role });
    return { info: "Rolle geändert." };
  });
}

export async function setGuardianAction(formData: FormData) {
  await handle(formData, "/team", async () => {
    const user = await assertMember("team.verwalten");
    await setGuardian({
      teamId: user.teamId,
      userId: text(formData, "userId"),
      managedById: text(formData, "managedById") || null,
    });
    return { info: "Stellvertretung gespeichert." };
  });
}

export async function removeMemberAction(formData: FormData) {
  await handle(formData, "/team", async () => {
    const user = await assertMember("team.verwalten");
    await removeMember({ teamId: user.teamId, actorId: user.id, userId: text(formData, "userId") });
    return { info: "Mitglied entfernt. Strafen und Protokoll bleiben erhalten." };
  });
}

export async function addMemberAction(formData: FormData) {
  await handle(formData, "/team", async () => {
    const user = await assertMember("team.verwalten");
    const m = await addMemberWithoutAccount({
      teamId: user.teamId,
      actorId: user.id,
      name: text(formData, "name"),
      managedById: text(formData, "managedById") || undefined,
    });
    return { info: `${m.name} ist im Kader.` };
  });
}

export async function regenerateCodeAction(formData: FormData) {
  await handle(formData, "/team", async () => {
    const user = await assertMember("team.verwalten");
    await regenerateJoinCode(user.teamId);
    return { info: "Neuer Team-Code erstellt. Der alte gilt nicht mehr." };
  });
}

export async function renameTeamAction(formData: FormData) {
  await handle(formData, "/team", async () => {
    const user = await assertMember("team.verwalten");
    await renameTeam(user.teamId, text(formData, "name"));
    return { info: "Teamname gespeichert." };
  });
}
