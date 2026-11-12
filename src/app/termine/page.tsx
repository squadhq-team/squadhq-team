import Link from "next/link";
import type { EventType } from "@prisma/client";
import { can, requireMember } from "@/lib/auth";
import { EVENT_TYPE_LABEL, formatDateTime } from "@/lib/format";
import { countResponses, listPast, listUpcoming } from "@/services/attendanceService";
import { listRespondents, listSquad } from "@/services/teamService";
import { EventCard } from "@/components/EventCard";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Tabs, eventTone } from "@/components/ui";

/** Terminübersicht für alle (REQ-ATT-01/02): kommende Termine mit 1-Klick-Zusage, vergangene zum Nachsehen bzw. Bestätigen. */
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ typ?: string }> }) {
  const user = await requireMember();
  const { typ } = await searchParams;
  const type = typ && typ in EVENT_TYPE_LABEL ? (typ as EventType) : undefined;
  const respondents = await listRespondents(user);
  const [upcoming, past, squad] = await Promise.all([
    listUpcoming(user.teamId, undefined, type),
    listPast(user.teamId, 20, type),
    listSquad(user.teamId),
  ]);
  const manage = can(user, "termine.verwalten");
  const confirm = can(user, "anwesenheit.bestaetigen");

  return (
    <>
      <PageHeader title="Termine" />
      {manage && (
        <div className="grid grid-cols-2 gap-2">
          <ButtonLink href="/termine/neu">+ Termin erstellen</ButtonLink>
          <ButtonLink href="/termine/import" variant="secondary">
            Spielplan importieren
          </ButtonLink>
        </div>
      )}
      <Tabs
        active={type ?? "ALLE"}
        items={[
          { key: "ALLE", label: "Alle", href: "/termine" },
          ...(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((t) => ({
            key: t,
            label: EVENT_TYPE_LABEL[t],
            href: `/termine?typ=${t}`,
          })),
        ]}
      />
      <section className="space-y-3">
        <h2 className="display text-xl">Als Nächstes</h2>
        {upcoming.length === 0 ? (
          <Card>
            <EmptyState>Keine Termine geplant.</EmptyState>
          </Card>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((e) => (
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
      <Card title={confirm ? "Vergangen: Anwesenheit bestätigen" : "Vergangene Termine"}>
        {past.length === 0 && <EmptyState>Noch keine vergangenen Termine.</EmptyState>}
        <ul className="divide-y divide-stone-100">
          {past.map((s) => {
            const unconfirmed =
              confirm &&
              !s.cancelledAt &&
              s.type !== "PARTY" &&
              s.type !== "OTHER" &&
              s.attendances.filter((a) => a.status !== "UNSURE").length < squad.length;
            const attending = s.attendances.filter((a) => a.status === "ATTENDING").length;
            return (
              <li key={s.id}>
                <Link
                  href={`/termine/${s.id}`}
                  className="flex items-center justify-between gap-2 py-3 hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <p className={`truncate font-medium ${s.cancelledAt ? "line-through" : ""}`}>
                      {s.title}
                      {s.opponent ? ` – ${s.opponent}` : ""}
                    </p>
                    <p className="text-sm text-stone-500">{formatDateTime(s.startsAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <Badge tone={eventTone(s.type)}>{EVENT_TYPE_LABEL[s.type]}</Badge>
                    {s.cancelledAt ? (
                      <Badge tone="gray">Abgesagt</Badge>
                    ) : (
                      <Badge tone="green">{attending} dabei</Badge>
                    )}
                    {unconfirmed && <Badge tone="amber">Prüfen</Badge>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
