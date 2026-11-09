import { requireRole } from "@/lib/auth";
import { ATTENDANCE_LABEL, PENALTY_LABEL, formatDateTime, formatEuro } from "@/lib/format";
import { listUpcomingForPlayer } from "@/services/attendanceService";
import { getPlayerAccount } from "@/services/penaltyEngine";
import { Badge, Card, attendanceTone, penaltyTone } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { respondAction } from "../actions";

const PLAYER_BUTTONS = [
  { status: "ATTENDING", label: "Dabei", className: "bg-emerald-600 hover:bg-emerald-700" },
  { status: "EXCUSED", label: "Fehle entschuldigt", className: "bg-sky-600 hover:bg-sky-700" },
  { status: "UNSURE", label: "Noch unsicher", className: "bg-amber-500 hover:bg-amber-600" },
] as const;

/** Spieler-Ansicht: 1-Klick-Rückmeldung (REQ-ATT-01) und eigenes Kassenkonto (REQ-PEN-03). */
export default async function PlayerPage() {
  const user = await requireRole("PLAYER");
  const [sessions, account] = await Promise.all([listUpcomingForPlayer(user.id), getPlayerAccount(user.id)]);
  const saldo = account.saldoCents;
  const visible = account.entries;

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
                  <Badge tone={attendanceTone(mine?.status)}>
                    {mine ? ATTENDANCE_LABEL[mine.status] : "Keine Antwort"}
                  </Badge>
                </div>
                <ActionForm action={respondAction} className="mt-3 space-y-2">
                  <input type="hidden" name="sessionId" value={s.id} />
                  <input
                    name="note"
                    defaultValue={mine?.note ?? ""}
                    placeholder="Grund (optional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2 text-sm font-medium text-white">
                    {PLAYER_BUTTONS.map((c) => (
                      <SubmitButton
                        key={c.status}
                        name="status"
                        value={c.status}
                        current={mine?.status ?? null}
                        className={`rounded-lg px-2 py-2.5 ${c.className}`}
                      >
                        {c.label}
                      </SubmitButton>
                    ))}
                  </div>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card
        title="Mein Kassenkonto"
        action={
          <span className={`text-xl font-bold ${saldo > 0 ? "text-red-700" : "text-emerald-700"}`}>
            {formatEuro(saldo)}
          </span>
        }
      >
        <p className="mb-3 text-sm text-gray-600">
          {saldo > 0 ? "Offener Betrag. Bitte bar nach dem Training oder per PayPal an die Kasse." : "Alles bezahlt."}
        </p>
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
