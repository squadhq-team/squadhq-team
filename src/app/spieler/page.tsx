import { requireRole } from "@/lib/auth";
import { ATTENDANCE_LABEL, PENALTY_LABEL, formatDateTime, formatEuro } from "@/lib/format";
import { balance } from "@/domain/penalties";
import { listUpcomingForPlayer } from "@/services/attendanceService";
import { listPenaltiesForPlayer } from "@/services/penaltyEngine";
import { Badge, Card, attendanceTone, penaltyTone } from "@/components/ui";
import { respondAction } from "../actions";

/** Spieler-Ansicht: 1-Klick-Rückmeldung (REQ-ATT-01) und eigenes Kassenkonto (REQ-PEN-03). */
export default async function PlayerPage() {
  const user = await requireRole("PLAYER");
  const [sessions, penalties] = await Promise.all([listUpcomingForPlayer(user.id), listPenaltiesForPlayer(user.id)]);
  const saldo = balance(penalties);
  const visible = penalties.filter((p) => p.status !== "PENDING_APPROVAL" && p.status !== "CANCELLED");

  return (
    <>
      <h1 className="text-2xl font-bold">Hallo {user.name.split(" ")[0]}</h1>

      <Card title="Nächste Trainings">
        {sessions.length === 0 && <p className="text-sm text-gray-500">Keine Trainings geplant.</p>}
        <ul className="space-y-4">
          {sessions.map((s) => {
            const mine = s.attendances[0] ?? null;
            return (
              <li key={s.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(s.startsAt)} · {s.location}
                    </p>
                    <p className="text-xs text-gray-500">Rückmeldung bis {formatDateTime(s.responseDeadline)}</p>
                  </div>
                  <Badge tone={attendanceTone(mine?.status)}>{mine ? ATTENDANCE_LABEL[mine.status] : "Keine Antwort"}</Badge>
                </div>
                <form action={respondAction} className="mt-3 space-y-2">
                  <input type="hidden" name="sessionId" value={s.id} />
                  <input
                    name="note"
                    defaultValue={mine?.note ?? ""}
                    placeholder="Grund (optional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2 text-sm font-medium">
                    <button name="status" value="ATTENDING" className="rounded-lg bg-emerald-600 px-2 py-2.5 text-white hover:bg-emerald-700">
                      Dabei
                    </button>
                    <button name="status" value="EXCUSED" className="rounded-lg bg-sky-600 px-2 py-2.5 text-white hover:bg-sky-700">
                      Fehle entschuldigt
                    </button>
                    <button name="status" value="UNSURE" className="rounded-lg bg-amber-500 px-2 py-2.5 text-white hover:bg-amber-600">
                      Noch unsicher
                    </button>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Mein Kassenkonto" action={<span className={`text-xl font-bold ${saldo > 0 ? "text-red-700" : "text-emerald-700"}`}>{formatEuro(saldo)}</span>}>
        <p className="mb-3 text-sm text-gray-600">{saldo > 0 ? "Offener Betrag. Bitte bar nach dem Training oder per PayPal an die Kasse." : "Alles bezahlt."}</p>
        {visible.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Strafen.</p>
        ) : (
          <ul className="divide-y text-sm">
            {visible.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">{p.rule.title}</p>
                  <p className="text-xs text-gray-500">
                    {p.session ? formatDateTime(p.session.startsAt) : "ohne Training"}
                    {p.dueDate && ` · fällig ${formatDateTime(p.dueDate)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatEuro(p.amountCents)}</p>
                  <Badge tone={penaltyTone(p.status)}>{PENALTY_LABEL[p.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
