import { can, requireMember } from "@/lib/auth";
import { listAnnouncements, listPolls } from "@/services/newsService";
import { AnnouncementCard, PollCard } from "@/components/NewsCards";
import { ButtonLink, Card, EmptyState, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { createAnnouncementAction } from "./actions";

/** Neuigkeiten & Ankündigungen (#49) und Umfragen (#50). */
export default async function NewsPage() {
  const user = await requireMember();
  const [announcements, polls] = await Promise.all([listAnnouncements(user.teamId, 50), listPolls(user.teamId, 30)]);
  const write = can(user, "news.schreiben");
  const admin = can(user, "team.verwalten");
  return (
    <>
      <PageHeader title="Neuigkeiten" back={{ href: "/start", label: "Start" }} />
      {write && (
        <Card title="Ankündigung schreiben">
          <ActionForm action={createAnnouncementAction} className="space-y-3">
            <Field label="Titel">
              <input name="title" required placeholder="z. B. Training fällt aus" className={inputClass} />
            </Field>
            <Field label="Text">
              <textarea name="body" required rows={4} className={inputClass} />
            </Field>
            {admin && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="pinned" className="h-5 w-5 accent-brand-700" />
                Oben anheften
              </label>
            )}
            <div className="grid grid-cols-2 gap-2">
              <SubmitButton className={btn.primary}>Veröffentlichen</SubmitButton>
              <ButtonLink href="/neuigkeiten/umfrage" variant="secondary">
                Umfrage starten
              </ButtonLink>
            </div>
          </ActionForm>
        </Card>
      )}
      {polls.map((p) => (
        <PollCard key={p.id} poll={p} userId={user.id} canClose={write} />
      ))}
      {announcements.map((a) => (
        <AnnouncementCard key={a.id} a={a} canDelete={a.authorId === user.id || admin} />
      ))}
      {announcements.length === 0 && polls.length === 0 && (
        <Card>
          <EmptyState>Noch keine Neuigkeiten.</EmptyState>
        </Card>
      )}
    </>
  );
}
