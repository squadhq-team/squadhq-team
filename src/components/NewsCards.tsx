/** Darstellung von Ankündigungen (#49) und Umfragen (#50), genutzt auf Start und Neuigkeiten. */
import { formatDateTime } from "@/lib/format";
import { ActionForm, SubmitButton } from "./SubmitButton";
import { Avatar, Badge, btn } from "./ui";
import { closePollAction, deleteAnnouncementAction, voteAction } from "@/app/neuigkeiten/actions";

type AnnouncementLike = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  authorId: string;
  author: { name: string };
};

export function AnnouncementCard({ a, canDelete }: { a: AnnouncementLike; canDelete: boolean }) {
  return (
    <article className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${a.pinned ? "ring-brand-200" : "ring-black/5"}`}>
      <div className="flex items-start gap-3">
        <Avatar name={a.author.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold">{a.title}</h3>
            {a.pinned && <Badge tone="brand">Angeheftet</Badge>}
          </div>
          <p className="text-xs text-stone-500">
            {a.author.name} · {formatDateTime(a.createdAt)}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm text-stone-800">{a.body}</p>
          {canDelete && (
            <ActionForm action={deleteAnnouncementAction} className="mt-2">
              <input type="hidden" name="id" value={a.id} />
              <SubmitButton className="text-xs text-stone-500 hover:text-red-700 hover:underline">Löschen</SubmitButton>
            </ActionForm>
          )}
        </div>
      </div>
    </article>
  );
}

type PollLike = {
  id: string;
  question: string;
  multiple: boolean;
  closesAt: Date | null;
  closedAt: Date | null;
  createdBy: { name: string };
  options: { id: string; text: string; votes: { userId: string; user: { name: string } }[] }[];
};

export function PollCard({ poll, userId, canClose }: { poll: PollLike; userId: string; canClose: boolean }) {
  const open = !poll.closedAt && (!poll.closesAt || poll.closesAt > new Date());
  const voters = new Set(poll.options.flatMap((o) => o.votes.map((v) => v.userId)));
  const max = Math.max(1, ...poll.options.map((o) => o.votes.length));
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <Badge tone={open ? "blue" : "gray"}>{open ? "Umfrage" : "Beendet"}</Badge>
        {poll.multiple && <Badge tone="gray">Mehrere Antworten</Badge>}
      </div>
      <h3 className="font-semibold">{poll.question}</h3>
      <p className="mb-3 text-xs text-stone-500">
        von {poll.createdBy.name} · {voters.size} {voters.size === 1 ? "Stimme" : "Stimmen"}
        {open && poll.closesAt && ` · läuft bis ${formatDateTime(poll.closesAt)}`}
      </p>
      <ul className="space-y-2">
        {poll.options.map((o) => {
          const mine = o.votes.some((v) => v.userId === userId);
          return (
            <li key={o.id}>
              <ActionForm action={voteAction}>
                <input type="hidden" name="optionId" value={o.id} />
                <SubmitButton
                  className={`relative w-full overflow-hidden rounded-xl px-3 py-2.5 text-left text-sm ring-1 ${
                    mine ? "font-semibold ring-2 ring-brand-600" : "ring-stone-200"
                  } ${open ? "" : "pointer-events-none"}`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-brand-50"
                    style={{ width: `${(o.votes.length / max) * 100}%` }}
                  />
                  <span className="relative flex w-full items-center justify-between gap-2">
                    <span>
                      {mine ? "✓ " : ""}
                      {o.text}
                    </span>
                    <span className="text-xs text-stone-600">{o.votes.length}</span>
                  </span>
                </SubmitButton>
              </ActionForm>
              {o.votes.length > 0 && (
                <p className="mt-0.5 pl-1 text-xs text-stone-500">{o.votes.map((v) => v.user.name).join(", ")}</p>
              )}
            </li>
          );
        })}
      </ul>
      {open && canClose && (
        <ActionForm action={closePollAction} className="mt-3">
          <input type="hidden" name="pollId" value={poll.id} />
          <SubmitButton className={`${btn.small} text-stone-600 hover:bg-stone-100`}>Umfrage beenden</SubmitButton>
        </ActionForm>
      )}
    </article>
  );
}
