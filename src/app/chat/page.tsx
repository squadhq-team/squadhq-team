import { requireMember } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { listMessages } from "@/services/newsService";
import { Avatar, PageHeader } from "@/components/ui";
import { ChatAutoRefresh, ChatComposer } from "@/components/ChatClient";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { deleteMessageAction } from "../neuigkeiten/actions";

/** Team-Chat: ein gemeinsamer Verlauf statt unübersichtlicher WhatsApp-Gruppen. */
export default async function ChatPage() {
  const user = await requireMember();
  const messages = await listMessages(user.teamId);
  return (
    <>
      <PageHeader title="Chat" subtitle={user.team.name} />
      <ChatAutoRefresh />
      <ul className="space-y-3 pb-16 md:pb-0">
        {messages.length === 0 && (
          <li className="text-sm text-stone-500">Noch keine Nachrichten. Schreib die erste!</li>
        )}
        {messages.map((m) => {
          const mine = m.authorId === user.id;
          return (
            <li key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              {!mine && <Avatar name={m.author.name} size="sm" />}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm ${mine ? "rounded-br-sm bg-brand-700 text-white" : "rounded-bl-sm bg-white ring-1 ring-black/5"}`}
              >
                {!mine && <p className="text-xs font-semibold text-brand-700">{m.author.name}</p>}
                <p className="whitespace-pre-line break-words text-sm">{m.body}</p>
                <p
                  className={`mt-0.5 flex items-center gap-2 text-[11px] ${mine ? "text-white/70" : "text-stone-400"}`}
                >
                  {formatDateTime(m.createdAt)}
                  {mine && (
                    <ActionForm action={deleteMessageAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <SubmitButton className="hover:underline">löschen</SubmitButton>
                    </ActionForm>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <ChatComposer />
    </>
  );
}
