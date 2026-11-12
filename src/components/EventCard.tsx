/**
 * Termin als Karte (Start, Termine): farbige Kopfzeile mit Datum und Titel, Zeitzeile (Treffen, Beginn, Frist),
 * Stand der Zusagen und 1-Klick-Rückmeldung für sich selbst bzw. vertretene Mitglieder.
 */
import Link from "next/link";
import { EVENT_TYPE_LABEL, formatDateTime, formatDayShort, formatTime, formatWeekdayTime } from "@/lib/format";
import { RespondForm } from "./RespondForm";

type EventLike = {
  id: string;
  type: keyof typeof EVENT_TYPE_LABEL;
  title: string;
  opponent: string | null;
  startsAt: Date;
  responseDeadline: Date;
  location: string | null;
  meetingAt: Date | null;
  cancelledAt: Date | null;
  attendances: { userId: string; status: string; note: string | null }[];
};

const HEADER: Record<EventLike["type"], string> = {
  TRAINING: "bg-brand-700",
  GAME: "bg-ink",
  TOURNAMENT: "bg-violet-800",
  PARTY: "bg-amber-600",
  OTHER: "bg-stone-600",
};

const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "Europe/Berlin" });

export function EventCard({
  event,
  respondents,
  selfId,
  counts,
}: {
  event: EventLike;
  /** Personen, für die der Nutzer hier zu-/absagt (er selbst und/oder vertretene Mitglieder) */
  respondents: { id: string; name: string }[];
  /** eigene ID: bei vertretenen Mitgliedern wird der Name dazugeschrieben */
  selfId: string;
  /** Stand der Rückmeldungen im ganzen Team */
  counts: { attending: number; unsure: number; absent: number; open: number };
}) {
  const now = new Date();
  const open = !event.cancelledAt && event.startsAt > now;
  const deadlinePassed = event.responseDeadline < now;
  return (
    <li className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <Link
        href={`/termine/${event.id}`}
        className={`flex items-center gap-3 px-4 py-3 text-white ${event.cancelledAt ? "bg-stone-400" : HEADER[event.type]}`}
      >
        <span className="w-11 shrink-0 text-center leading-tight">
          <span className="block text-xs font-semibold uppercase opacity-80">
            {weekday.format(event.startsAt).replace(".", "")}
          </span>
          <span className="display block text-lg">{formatDayShort(event.startsAt)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={`display block truncate text-xl ${event.cancelledAt ? "line-through" : ""}`}>
            {event.title}
            {event.opponent ? ` – ${event.opponent}` : ""}
          </span>
          <span className="block truncate text-xs opacity-85">
            {event.cancelledAt ? "Abgesagt" : EVENT_TYPE_LABEL[event.type]}
            {event.location ? ` · ${event.location}` : ""}
          </span>
        </span>
        <span aria-hidden className="text-xl opacity-80">
          ›
        </span>
      </Link>
      <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100 py-2 text-center">
        <TimeCell label="Treffen" value={event.meetingAt ? formatTime(event.meetingAt) : "–"} />
        <TimeCell label="Beginn" value={formatTime(event.startsAt)} />
        <TimeCell label="Antwort bis" value={formatWeekdayTime(event.responseDeadline)} />
      </div>
      <div className="flex items-center gap-4 px-4 py-2 text-sm">
        <Count icon="👍" value={counts.attending} label="dabei" className="text-emerald-700" />
        <Count icon="?" value={counts.unsure} label="unsicher" className="text-amber-600" />
        <Count icon="👎" value={counts.absent} label="fehlen" className="text-stone-600" />
        <Count icon="…" value={counts.open} label="offen" className="text-stone-400" />
      </div>
      {open &&
        respondents.map((r) => {
          const mine = event.attendances.find((a) => a.userId === r.id) ?? null;
          return (
            <div key={r.id} className="border-t border-stone-100 px-4 pb-4 pt-3">
              <p className="mb-2 text-xs text-stone-500">
                {r.id !== selfId && <strong className="text-stone-800">Für {r.name}: </strong>}
                {mine
                  ? "Antwort bis zum Beginn änderbar."
                  : deadlinePassed
                    ? "Frist abgelaufen, bitte trotzdem antworten."
                    : `Bitte antworten bis ${formatDateTime(event.responseDeadline)}.`}
              </p>
              <RespondForm
                sessionId={event.id}
                memberId={r.id}
                current={mine?.status ?? null}
                note={mine?.note}
                showNote={false}
              />
            </div>
          );
        })}
    </li>
  );
}

function TimeCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-semibold">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-stone-400">{label}</p>
    </div>
  );
}

function Count({ icon, value, label, className }: { icon: string; value: number; label: string; className: string }) {
  return (
    <span className={`flex items-center gap-1 font-semibold ${className}`} title={`${value} ${label}`}>
      <span aria-hidden>{icon}</span>
      {value}
      <span className="sr-only">{label}</span>
    </span>
  );
}
