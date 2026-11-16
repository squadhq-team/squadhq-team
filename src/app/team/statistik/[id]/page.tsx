import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { formatDate, formatDayShort } from "@/lib/format";
import { getPlayerRatings } from "@/services/ratingService";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { Stars, TrendBadge, formatAverage } from "@/components/Rating";
import { DataTable, LineChart } from "@/components/charts";

/**
 * #65: Leistungsverlauf eines Spielers mit allen Bewertungen und Notizen.
 * Nur für Trainer/Betreuer, den Spieler selbst und seinen Stellvertreter; alle anderen landen wieder auf der Übersicht.
 */
export default async function PlayerRatingsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireMember();
  const { id } = await params;
  let data: Awaited<ReturnType<typeof getPlayerRatings>>;
  try {
    data = await getPlayerRatings(user, id);
  } catch {
    redirect("/team/statistik?ansicht=leistung");
  }
  const { player, ratings, count, average, recentAverage, trend } = data;
  const own = player.id === user.id;
  const chronological = [...ratings].reverse();

  return (
    <>
      <PageHeader
        title={own ? "Meine Leistung" : player.name}
        subtitle="Bewertungen nach dem Training"
        back={{ href: "/team/statistik?ansicht=leistung", label: "Statistik" }}
      />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Schnitt" value={average === null ? "–" : `${formatAverage(average)} ★`} />
        <Stat label="Letzte 3" value={recentAverage === null ? "–" : `${formatAverage(recentAverage)} ★`} />
        <Stat label="Bewertungen" value={String(count)} />
      </div>
      {trend && (
        <p className="text-sm text-stone-600">
          Trend der letzten Trainings: <TrendBadge trend={trend} />
        </p>
      )}

      {count > 1 && (
        <Card title="Verlauf">
          <LineChart
            points={chronological.map((r) => ({
              label: formatDayShort(r.session.startsAt),
              value: r.stars,
              title: `${formatDayShort(r.session.startsAt)}: ${r.stars} von 5 Sternen`,
            }))}
            domain={[1, 5]}
            formatY={(v) => `${v} ★`}
            ariaLabel={`Sterne je Training von ${player.name}`}
          />
          <DataTable
            caption={`Bewertungen von ${player.name}`}
            head={["Training", "Sterne"]}
            rows={ratings.map((r) => [formatDayShort(r.session.startsAt), String(r.stars)])}
          />
        </Card>
      )}

      <Card title="Alle Bewertungen">
        {ratings.length === 0 && <EmptyState>Noch keine Bewertung.</EmptyState>}
        <ul className="divide-y divide-stone-100">
          {ratings.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/termine/${r.sessionId}`} className="text-sm font-medium hover:underline">
                  {formatDate(r.session.startsAt)}
                </Link>
                <Stars value={r.stars} className="text-lg" />
              </div>
              {r.note && <p className="mt-1 whitespace-pre-line text-sm text-stone-700">„{r.note}“</p>}
              <p className="mt-0.5 text-xs text-stone-400">von {r.rater.name}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
