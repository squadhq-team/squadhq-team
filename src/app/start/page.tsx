import Link from "next/link";
import { can, requireMember } from "@/lib/auth";
import { formatDateTime, formatEuro } from "@/lib/format";
import { countResponses, listMissingResponses, listUpcoming } from "@/services/attendanceService";
import { listRespondents, listSquad } from "@/services/teamService";
import { getPlayerAccount, listPendingForTeam } from "@/services/penaltyEngine";
import { isPollOpen, listAnnouncements, listPolls } from "@/services/newsService";
import { pushPublicKey } from "@/services/pushService";
import { EventCard } from "@/components/EventCard";
import { AnnouncementCard, PollCard } from "@/components/NewsCards";
import { PushToggle } from "@/components/PushToggle";
import { ButtonLink, Card, EmptyState } from "@/components/ui";

/**
 * Startseite für alle Rollen: Erinnerungen (#26), nächste Termine mit 1-Klick-Zusage, Kassenstand,
 * offene Strafvorschläge (Trainer), Neuigkeiten (#49) und laufende Umfragen (#50).
 */
export default async function StartPage() {
  const user = await requireMember();
  const respondents = await listRespondents(user);
  const ids = respondents.map((r) => r.id);
  const [events, squad, missing, accounts, pending, announcements, polls] = await Promise.all([
    listUpcoming(user.teamId, 3),
    listSquad(user.teamId),
    listMissingResponses(user.teamId, ids),
    Promise.all(respondents.map(async (r) => ({ member: r, account: await getPlayerAccount(user.teamId, r.id) }))),
    can(user, "strafen.freigeben") ? listPendingForTeam(user.teamId) : Promise.resolve([]),
    listAnnouncements(user.teamId, 3),
    listPolls(user.teamId, 5),
  ]);
  const openPolls = polls.filter((p) => isPollOpen(p)).slice(0, 2);
  const isTrainer = can(user, "team.verwalten");

  return (
    <>
      <div>
        <p className="text-sm text-stone-500">{user.team.name}</p>
        <h1 className="display text-3xl">Hallo {user.name.split(" ")[0]}</h1>
      </div>

      {missing.length > 0 && (
        <Link href={`/termine/${missing[0].id}`} className="block rounded-2xl bg-accent p-4 text-ink shadow-sm">
          <p className="display text-lg">Bitte zu- oder absagen</p>
          <p className="text-sm">
            {missing.length === 1
              ? `${missing[0].title}: Antwort bis ${formatDateTime(missing[0].responseDeadline)}`
              : `${missing.length} Termine warten auf deine Antwort, der nächste bis ${formatDateTime(missing[0].responseDeadline)}.`}
          </p>
        </Link>
      )}

      {pending.length > 0 && (
        <Link
          href="/kasse?ansicht=freigabe"
          className="block rounded-2xl bg-amber-100 p-4 text-amber-900 ring-1 ring-amber-200"
        >
          <p className="display text-lg">{pending.length} Strafvorschläge warten auf dich</p>
          <p className="text-sm">Freigeben oder verwerfen, erst dann zählen sie in der Kasse.</p>
        </Link>
      )}

      <PushToggle publicKey={pushPublicKey()} compact />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="display text-xl">Als Nächstes</h2>
          <Link href="/termine" className="text-sm font-medium text-brand-700 hover:underline">
            Alle Termine
          </Link>
        </div>
        {events.length === 0 ? (
          <Card>
            <EmptyState>Keine Termine geplant.</EmptyState>
            {can(user, "termine.verwalten") && (
              <ButtonLink href="/termine/neu" className="mt-2 w-full">
                + Termin erstellen
              </ButtonLink>
            )}
          </Card>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                respondents={respondents}
                selfId={user.id}
                counts={countResponses(e.attendances, squad.length)}
              />
            ))}
          </ul>
        )}
      </section>

      {accounts.map(({ member, account }) => (
        <Link
          key={member.id}
          href={member.id === user.id ? "/kasse" : `/kasse?mitglied=${member.id}`}
          className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
        >
          <span>
            <span className="display block text-lg">
              {member.id === user.id ? "Mein Kassenkonto" : `Kasse ${member.name}`}
            </span>
            <span className="text-sm text-stone-500">
              {account.saldoCents > 0 ? "Offener Betrag, bitte beim Kassenwart zahlen" : "Alles bezahlt"}
            </span>
          </span>
          <span className={`display text-2xl ${account.saldoCents > 0 ? "text-red-700" : "text-brand-700"}`}>
            {formatEuro(account.saldoCents)}
          </span>
        </Link>
      ))}

      {(announcements.length > 0 || openPolls.length > 0 || can(user, "news.schreiben")) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="display text-xl">Neuigkeiten</h2>
            <Link href="/neuigkeiten" className="text-sm font-medium text-brand-700 hover:underline">
              {can(user, "news.schreiben") ? "Alle & neu schreiben" : "Alle ansehen"}
            </Link>
          </div>
          {openPolls.map((p) => (
            <PollCard key={p.id} poll={p} userId={user.id} canClose={false} />
          ))}
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} a={a} canDelete={a.authorId === user.id || isTrainer} />
          ))}
          {announcements.length === 0 && openPolls.length === 0 && (
            <Card>
              <EmptyState>Noch keine Neuigkeiten.</EmptyState>
            </Card>
          )}
        </section>
      )}
    </>
  );
}
