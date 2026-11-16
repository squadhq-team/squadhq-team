import Link from "next/link";
import type { EventType } from "@prisma/client";
import { can, requireMember } from "@/lib/auth";
import { EVENT_TYPE_LABEL, formatDayShort, formatEuro } from "@/lib/format";
import { getCashHistory, getParticipation, getTopPenalties } from "@/services/statsService";
import { getRatingOverview } from "@/services/ratingService";
import { Avatar, Card, EmptyState, PageHeader, Stat, Tabs } from "@/components/ui";
import { Stars, TrendBadge, formatAverage } from "@/components/Rating";
import { BarList, DataTable, LineChart } from "@/components/charts";

type View = "beteiligung" | "leistung" | "strafen" | "kasse";

const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)} %`);

/**
 * Statistik (#30, #65):
 * - Beteiligung je Mitglied (Training, Spiele oder alle Termine), bereinigt um Verletzungen – für alle
 * - Leistung aus den Bewertungen nach dem Training – Trainer/Betreuer sehen alle, Spieler nur sich selbst
 * - Top-Strafen (häufigste Katalogpositionen, ohne Namen) – für alle
 * - Kassenverlauf – nur, wer die ganze Kasse sehen darf (Trainer, Kassenwart)
 */
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ ansicht?: string; typ?: string }>;
}) {
  const user = await requireMember();
  const sp = await searchParams;
  const seeCash = can(user, "kasse.ansehen");
  const tabs: { key: View; label: string; href: string }[] = [
    { key: "beteiligung", label: "Beteiligung", href: "/team/statistik" },
    { key: "leistung", label: "Leistung", href: "/team/statistik?ansicht=leistung" },
    { key: "strafen", label: "Top-Strafen", href: "/team/statistik?ansicht=strafen" },
    ...(seeCash ? [{ key: "kasse" as const, label: "Kassenverlauf", href: "/team/statistik?ansicht=kasse" }] : []),
  ];
  const view = tabs.find((t) => t.key === sp.ansicht)?.key ?? "beteiligung";

  return (
    <>
      <PageHeader title="Statistik" subtitle={user.team.name} back={{ href: "/team", label: "Team" }} />
      <Tabs active={view} items={tabs} />
      {view === "beteiligung" && <Participation typ={sp.typ} teamId={user.teamId} />}
      {view === "leistung" && <Performance user={user} />}
      {view === "strafen" && <TopPenalties teamId={user.teamId} />}
      {view === "kasse" && seeCash && <CashHistory teamId={user.teamId} />}
    </>
  );
}

const PARTICIPATION_FILTERS = [
  { key: "TRAINING", label: EVENT_TYPE_LABEL.TRAINING },
  { key: "GAME", label: EVENT_TYPE_LABEL.GAME },
  { key: "ALLE", label: "Alle Termine" },
] as const;

/** #30: Beteiligungsquote je Mitglied; Standard ist die Trainingsbeteiligung. */
async function Participation({ teamId, typ }: { teamId: string; typ?: string }) {
  const filter = PARTICIPATION_FILTERS.find((f) => f.key === typ)?.key ?? "TRAINING";
  const rows = await getParticipation(teamId, filter === "ALLE" ? undefined : (filter as EventType));
  return (
    <Card>
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Termin-Typ">
        {PARTICIPATION_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/team/statistik?typ=${f.key}`}
            aria-current={f.key === filter ? "true" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              f.key === filter ? "bg-brand-100 text-brand-800" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <p className="mb-2 text-xs text-stone-500">
        Vergangene Termine seit dem Beitritt. Bereinigt: Termine, bei denen jemand verletzt war, zählen nicht mit.
      </p>
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
  );
}

/** #65: Leistung aus den Bewertungen. Wer was sieht, entscheidet der RatingService. */
async function Performance({ user }: { user: Parameters<typeof getRatingOverview>[0] }) {
  const { seesAll, rows } = await getRatingOverview(user);
  return (
    <Card>
      <p className="mb-2 text-xs text-stone-500">
        {seesAll
          ? "Bewertungen nach dem Training (1–5 Sterne). Bewerten kannst du im Termin, sobald das Training begonnen hat. Jeder Spieler sieht nur seine eigenen Bewertungen."
          : "Deine Bewertungen vom Trainer nach dem Training (1–5 Sterne), mit Notizen, woran du arbeiten kannst. Nur du und das Trainerteam sehen sie."}
      </p>
      {rows.length === 0 && <EmptyState>Keine Spieler im Kader.</EmptyState>}
      <ul className="divide-y divide-stone-100">
        {rows.map((r) => (
          <li key={r.member.id}>
            <Link href={`/team/statistik/${r.member.id}`} className="flex items-center gap-3 py-3 hover:bg-stone-50">
              <Avatar name={r.member.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.member.name}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                  {r.count === 0 ? (
                    "Noch nicht bewertet"
                  ) : (
                    <>
                      <Stars value={r.average ?? 0} />
                      <span>
                        {r.count} {r.count === 1 ? "Bewertung" : "Bewertungen"}
                      </span>
                      <TrendBadge trend={r.trend} />
                    </>
                  )}
                </p>
              </div>
              <p className="display w-12 shrink-0 text-right text-2xl">{formatAverage(r.average)}</p>
              <span aria-hidden className="text-stone-400">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** #65: häufigste Katalogpositionen. */
async function TopPenalties({ teamId }: { teamId: string }) {
  const top = await getTopPenalties(teamId);
  return (
    <Card title="Häufigste Strafen">
      <p className="mb-3 text-xs text-stone-500">
        Freigegebene Strafen aus dem Katalog, ohne Mahngebühren und Beiträge. Wer welche Strafe hat, steht nur in der
        Teamkasse.
      </p>
      {top.length === 0 ? (
        <EmptyState>Noch keine Strafen vergeben.</EmptyState>
      ) : (
        <BarList
          items={top.map((t) => ({
            key: t.ruleId,
            label: t.title,
            value: t.count,
            detail: `${t.count}× · ${formatEuro(t.totalCents)}`,
          }))}
        />
      )}
    </Card>
  );
}

/** #65: Kassenstand im Zeitverlauf (Trainer, Kassenwart). */
async function CashHistory({ teamId }: { teamId: string }) {
  const { balanceCents, inCents, expenseCents, startCents, points } = await getCashHistory(teamId);
  const chart = [
    ...(points.length
      ? [{ label: "Start", value: startCents, title: `Vor der ersten Buchung: ${formatEuro(startCents)}` }]
      : []),
    ...points.map((p) => ({
      label: formatDayShort(p.at),
      value: p.balanceCents,
      title: `${formatDayShort(p.at)}: ${formatEuro(p.balanceCents)} (${p.deltaCents >= 0 ? "+" : ""}${formatEuro(p.deltaCents)})`,
    })),
  ];
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Kassenstand" value={formatEuro(balanceCents)} />
        <Stat label="Eingenommen" value={formatEuro(inCents)} tone="text-emerald-700" />
        <Stat label="Ausgaben" value={formatEuro(expenseCents)} tone="text-red-700" />
      </div>
      <Card title="Kassenverlauf">
        <p className="mb-2 text-xs text-stone-500">
          Kassenstand nach jedem Tag mit Zahlungseingang, Einnahme oder Ausgabe. Der letzte Punkt ist der aktuelle Stand
          der Teamkasse.
        </p>
        {points.length === 0 ? (
          <EmptyState>Noch keine Zahlungen, Einnahmen oder Ausgaben.</EmptyState>
        ) : (
          <>
            <LineChart points={chart} formatY={formatEuro} step ariaLabel="Kassenstand im Zeitverlauf" />
            <DataTable
              caption="Kassenstand je Tag"
              head={["Tag", "Bewegung", "Kassenstand"]}
              rows={[...points]
                .reverse()
                .map((p) => [formatDayShort(p.at), formatEuro(p.deltaCents), formatEuro(p.balanceCents)])}
            />
          </>
        )}
      </Card>
    </>
  );
}
