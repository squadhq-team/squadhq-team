import type { EventType } from "@prisma/client";
import { requireMember } from "@/lib/auth";
import { EVENT_TYPE_LABEL } from "@/lib/format";
import { getParticipation } from "@/services/statsService";
import { Avatar, Card, EmptyState, PageHeader, Tabs } from "@/components/ui";

const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)} %`);

/** #30: Beteiligungsquote je Mitglied, bereinigt um Verletzungen. */
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ typ?: string }> }) {
  const user = await requireMember();
  const { typ } = await searchParams;
  const type = typ === "TRAINING" || typ === "GAME" ? (typ as EventType) : undefined;
  const rows = await getParticipation(user.teamId, type);
  return (
    <>
      <PageHeader
        title="Statistik"
        subtitle="Beteiligung an vergangenen Terminen. Bereinigt: Termine, bei denen jemand verletzt war, zählen nicht mit."
        back={{ href: "/team", label: "Team" }}
      />
      <Tabs
        active={type ?? "ALLE"}
        items={[
          { key: "ALLE", label: "Alle Termine", href: "/team/statistik" },
          { key: "TRAINING", label: EVENT_TYPE_LABEL.TRAINING, href: "/team/statistik?typ=TRAINING" },
          { key: "GAME", label: EVENT_TYPE_LABEL.GAME, href: "/team/statistik?typ=GAME" },
        ]}
      />
      <Card>
        {rows.length === 0 && <EmptyState>Noch keine Daten.</EmptyState>}
        <ul className="divide-y divide-stone-100">
          {rows.map((r) => (
            <li key={r.member.id} className="flex items-center gap-3 py-3">
              <Avatar name={r.member.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.member.name}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.round((r.adjustedRate ?? 0) * 100)}%` }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  {r.attended} von {r.total} dabei{r.injured ? ` · ${r.injured}× verletzt` : ""} · roh {pct(r.rate)}
                </p>
              </div>
              <p className="display w-16 shrink-0 text-right text-2xl">{pct(r.adjustedRate)}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
