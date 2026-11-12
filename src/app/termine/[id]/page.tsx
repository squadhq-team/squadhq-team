import Link from "next/link";
import { can, requireMember } from "@/lib/auth";
import {
  ATTENDANCE_LABEL,
  EVENT_TYPE_LABEL,
  entryTitle,
  formatDate,
  formatDateTime,
  formatEuro,
  formatTime,
} from "@/lib/format";
import { getAttendanceList } from "@/services/attendanceService";
import { listPendingForSession } from "@/services/penaltyEngine";
import { listRespondents } from "@/services/teamService";
import { Avatar, Badge, ButtonLink, Card, attendanceTone, btn, eventTone } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { RespondForm } from "@/components/RespondForm";
import { approveAction, discardAction, setAttendanceAction, setLineupAction } from "../actions";

const TRAINER_CHOICES = [
  { status: "ATTENDING", label: "Da", className: "bg-emerald-600 hover:bg-emerald-700" },
  { status: "EXCUSED", label: "Entsch.", className: "bg-sky-600 hover:bg-sky-700" },
  { status: "INJURED", label: "Verletzt", className: "bg-violet-600 hover:bg-violet-700" },
  { status: "UNEXCUSED", label: "Unentsch.", className: "bg-red-600 hover:bg-red-700" },
] as const;

const GROUPS = [
  { key: "ATTENDING", title: "Dabei" },
  { key: "UNSURE", title: "Unsicher" },
  { key: "EXCUSED", title: "Entschuldigt" },
  { key: "INJURED", title: "Verletzt" },
  { key: "UNEXCUSED", title: "Unentschuldigt" },
  { key: "NONE", title: "Noch keine Antwort" },
] as const;

/**
 * Termin-Details für alle: Zusatzinfos (#48), eigene Rückmeldung, wer kommt.
 * Trainer/Betreuer: Anwesenheit nach dem Termin bestätigen (REQ-ATT-02), Aufstellung bei Spielen (#29).
 * Trainer: Strafvorschläge freigeben (REQ-PEN-02).
 */
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireMember();
  const { id } = await params;
  const [{ session, rows }, respondents] = await Promise.all([
    getAttendanceList(user.teamId, id),
    listRespondents(user),
  ]);
  const pending = can(user, "strafen.freigeben") ? await listPendingForSession(user.teamId, id) : [];
  const now = new Date();
  const started = session.startsAt <= now;
  const manage = can(user, "termine.verwalten");
  const confirm = can(user, "anwesenheit.bestaetigen") && started && !session.cancelledAt;
  const isGame = session.type === "GAME" || session.type === "TOURNAMENT";
  const grouped = GROUPS.map((g) => ({
    ...g,
    rows: rows.filter((r) => (r.attendance?.status ?? "NONE") === g.key),
  })).filter((g) => g.rows.length > 0);
  const starters = rows.filter((r) => r.attendance?.lineup === "STARTER");
  const bench = rows.filter((r) => r.attendance?.lineup === "BENCH");
  const back = `/termine/${session.id}`;

  return (
    <>
      <Link href="/termine" className="inline-block py-1 text-sm font-medium text-brand-700 hover:underline">
        ← Termine
      </Link>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div
          className={`px-4 py-4 text-white ${session.cancelledAt ? "bg-stone-400" : session.type === "GAME" ? "bg-ink" : "bg-brand-700"}`}
        >
          <div className="mb-1 flex flex-wrap gap-1.5">
            <Badge tone={eventTone(session.type)}>{EVENT_TYPE_LABEL[session.type]}</Badge>
            {session.cancelledAt && <Badge tone="red">Abgesagt</Badge>}
          </div>
          <h1 className={`display text-3xl ${session.cancelledAt ? "line-through" : ""}`}>
            {session.title}
            {session.opponent ? ` – ${session.opponent}` : ""}
          </h1>
          <p className="text-sm opacity-90">{formatDate(session.startsAt)}</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100 py-3 text-center">
          <Info label="Treffen" value={session.meetingAt ? formatTime(session.meetingAt) : "–"} />
          <Info label="Beginn" value={formatTime(session.startsAt)} />
          <Info label="Antwort bis" value={formatDateTime(session.responseDeadline)} small />
        </div>
        <dl className="space-y-2 px-4 py-3 text-sm">
          {session.location && <Row label="Ort" value={session.location} />}
          {session.meetingPoint && <Row label="Treffpunkt" value={session.meetingPoint} />}
          {session.tasks && <Row label="Aufgaben" value={session.tasks} />}
          {session.notes && <Row label="Notiz" value={session.notes} />}
          <Row label="Erstellt von" value={session.createdBy.name} />
        </dl>
        {manage && (
          <div className="border-t border-stone-100 px-4 py-3">
            <ButtonLink href={`/termine/${session.id}/bearbeiten`} variant="secondary" className="w-full">
              Bearbeiten oder absagen
            </ButtonLink>
          </div>
        )}
      </section>

      {!started &&
        !session.cancelledAt &&
        respondents.map((r) => {
          const mine = rows.find((row) => row.player.id === r.id)?.attendance ?? null;
          return (
            <Card key={r.id} title={r.id === user.id ? "Deine Antwort" : `Antwort für ${r.name}`}>
              <RespondForm sessionId={session.id} memberId={r.id} current={mine?.status ?? null} note={mine?.note} />
            </Card>
          );
        })}

      {pending.length > 0 && (
        <Card title="Strafvorschläge zur Freigabe">
          <ul className="divide-y divide-stone-100">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">{p.player.name}</p>
                  <p className="text-sm text-stone-600">
                    {entryTitle(p)} · {formatEuro(p.amountCents)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ActionForm action={approveAction}>
                    <input type="hidden" name="entryId" value={p.id} />
                    <input type="hidden" name="back" value={back} />
                    <SubmitButton className={`${btn.small} bg-ink text-white`}>Freigeben</SubmitButton>
                  </ActionForm>
                  <ActionForm action={discardAction}>
                    <input type="hidden" name="entryId" value={p.id} />
                    <input type="hidden" name="back" value={back} />
                    <SubmitButton className={`${btn.small} bg-stone-100 hover:bg-stone-200`}>Verwerfen</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {confirm && (
        <Card title="Anwesenheit bestätigen">
          <p className="mb-2 text-xs text-stone-500">
            Unentschuldigt erzeugt automatisch einen Strafvorschlag
            {session.type === "TRAINING" ? " (Pos. 8)" : isGame ? " (Pos. 9)" : " (bei diesem Termin-Typ nicht)"}, den
            der Trainer freigibt.
          </p>
          <ul className="divide-y divide-stone-100">
            {rows.map(({ player, attendance }) => (
              <li key={player.id} className="py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Avatar name={player.name} size="sm" />
                    <span className="font-medium">{player.name}</span>
                  </span>
                  <Badge tone={attendanceTone(attendance?.status)}>
                    {attendance ? ATTENDANCE_LABEL[attendance.status] : "Keine Antwort"}
                  </Badge>
                </div>
                {attendance?.note && <p className="mb-2 text-xs text-stone-500">Grund: {attendance.note}</p>}
                <ActionForm
                  action={setAttendanceAction}
                  className="grid grid-cols-4 gap-1.5 text-xs font-semibold text-white sm:text-sm"
                >
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="playerId" value={player.id} />
                  {TRAINER_CHOICES.map((c) => (
                    <SubmitButton
                      key={c.status}
                      name="status"
                      value={c.status}
                      current={attendance?.status ?? null}
                      className={`rounded-xl px-1 py-2 ${c.className}`}
                    >
                      {c.label}
                    </SubmitButton>
                  ))}
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isGame && (starters.length > 0 || bench.length > 0 || manage) && (
        <Card title="Aufstellung">
          {starters.length > 0 && (
            <p className="mb-1 text-sm">
              <strong>Startelf ({starters.length}/11):</strong>{" "}
              {starters
                .map(
                  (r) => `${r.player.name}${r.attendance?.lineupPosition ? ` (${r.attendance.lineupPosition})` : ""}`,
                )
                .join(", ")}
            </p>
          )}
          {bench.length > 0 && (
            <p className="mb-2 text-sm">
              <strong>Bank:</strong> {bench.map((r) => r.player.name).join(", ")}
            </p>
          )}
          {manage && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-semibold text-brand-700">Aufstellung bearbeiten</summary>
              <p className="my-2 text-xs text-stone-500">Zur Auswahl stehen alle, die nicht abgesagt haben.</p>
              <ul className="divide-y divide-stone-100">
                {rows
                  .filter((r) => !["EXCUSED", "INJURED", "UNEXCUSED"].includes(r.attendance?.status ?? ""))
                  .map(({ player, attendance }) => (
                    <li key={player.id} className="py-2">
                      <ActionForm action={setLineupAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="sessionId" value={session.id} />
                        <input type="hidden" name="playerId" value={player.id} />
                        <span className="min-w-28 flex-1 text-sm font-medium">{player.name}</span>
                        <input
                          name="lineupPosition"
                          defaultValue={attendance?.lineupPosition ?? player.position ?? ""}
                          placeholder="Position"
                          className="w-28 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
                        />
                        {[
                          { v: "STARTER", l: "Start" },
                          { v: "BENCH", l: "Bank" },
                          { v: "", l: "–" },
                        ].map((o) => (
                          <SubmitButton
                            key={o.v || "none"}
                            name="lineup"
                            value={o.v}
                            current={attendance?.lineup ?? ""}
                            className={`${btn.small} bg-stone-100 hover:bg-stone-200`}
                          >
                            {o.l}
                          </SubmitButton>
                        ))}
                      </ActionForm>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </Card>
      )}

      <Card title="Wer kommt?">
        <div className="space-y-3">
          {grouped.map((g) => (
            <div key={g.key}>
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Badge tone={attendanceTone(g.key === "NONE" ? null : g.key)}>{g.rows.length}</Badge>
                {g.title}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {g.rows.map(({ player, attendance }) => (
                  <li
                    key={player.id}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-sm"
                    title={attendance?.note ?? undefined}
                  >
                    {player.name}
                    {attendance?.note ? ` · ${attendance.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Info({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="px-1">
      <p className={`${small ? "text-sm" : "text-lg"} font-semibold`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-stone-400">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-stone-500">{label}</dt>
      <dd className="whitespace-pre-line">{value}</dd>
    </div>
  );
}
