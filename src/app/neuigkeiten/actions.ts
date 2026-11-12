"use server";
/** Server Actions für Neuigkeiten (#49), Umfragen (#50) und Team-Chat. */
import { assertMember, can } from "@/lib/auth";
import { handle, text } from "@/lib/actionUtils";
import { parseBerlinDateTime } from "@/lib/format";
import {
  closePoll,
  createAnnouncement,
  createPoll,
  deleteAnnouncement,
  deleteMessage,
  postMessage,
  vote,
} from "@/services/newsService";
import { notifyTeam } from "@/services/pushService";

export async function createAnnouncementAction(formData: FormData) {
  await handle(formData, "/neuigkeiten", async () => {
    const user = await assertMember("news.schreiben");
    const a = await createAnnouncement({
      teamId: user.teamId,
      authorId: user.id,
      title: text(formData, "title"),
      body: text(formData, "body"),
      pinned: text(formData, "pinned") === "on" && can(user, "team.verwalten"),
    });
    await notifyTeam(
      user.teamId,
      { title: a.title, body: a.body.slice(0, 120), url: "/neuigkeiten" },
      { exceptUserId: user.id },
    );
    return { to: "/neuigkeiten", info: "Ankündigung veröffentlicht." };
  });
}

export async function deleteAnnouncementAction(formData: FormData) {
  await handle(formData, "/neuigkeiten", async () => {
    const user = await assertMember();
    await deleteAnnouncement({
      teamId: user.teamId,
      id: text(formData, "id"),
      userId: user.id,
      isTrainer: can(user, "team.verwalten"),
    });
  });
}

export async function createPollAction(formData: FormData) {
  await handle(formData, "/neuigkeiten/umfrage", async () => {
    const user = await assertMember("news.schreiben");
    const closes = text(formData, "closesAt");
    const poll = await createPoll({
      teamId: user.teamId,
      createdById: user.id,
      question: text(formData, "question"),
      options: formData.getAll("option").map((o) => o.toString()),
      multiple: text(formData, "multiple") === "on",
      closesAt: closes ? parseBerlinDateTime(closes) : undefined,
    });
    await notifyTeam(
      user.teamId,
      { title: "Neue Umfrage", body: poll.question, url: "/neuigkeiten" },
      { exceptUserId: user.id },
    );
    return { to: "/neuigkeiten", info: "Umfrage gestartet." };
  });
}

export async function voteAction(formData: FormData) {
  await handle(formData, "/neuigkeiten", async () => {
    const user = await assertMember();
    await vote({ teamId: user.teamId, userId: user.id, optionId: text(formData, "optionId") });
  });
}

export async function closePollAction(formData: FormData) {
  await handle(formData, "/neuigkeiten", async () => {
    const user = await assertMember("news.schreiben");
    await closePoll({ teamId: user.teamId, pollId: text(formData, "pollId") });
  });
}

export async function postMessageAction(formData: FormData) {
  await handle(formData, "/chat", async () => {
    const user = await assertMember();
    await postMessage({ teamId: user.teamId, authorId: user.id, body: text(formData, "body") });
  });
}

export async function deleteMessageAction(formData: FormData) {
  await handle(formData, "/chat", async () => {
    const user = await assertMember();
    await deleteMessage({ teamId: user.teamId, id: text(formData, "id"), userId: user.id });
  });
}
