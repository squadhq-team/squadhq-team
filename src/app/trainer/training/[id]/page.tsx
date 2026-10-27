import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ATTENDANCE_LABEL, formatDateTime, formatEuro } from "@/lib/format";
import { getAttendanceList } from "@/services/attendanceService";
import { listPendingForSession } from "@/services/penaltyEngine";
import { Badge, Card, attendanceTone } from "@/components/ui";
import { approveAction, discardAction, setAttendanceAction } from "../../../actions";

const TRAINER_CHOICES = [
  { status: "ATTENDING", label: "Anwesend", className: "bg-emerald-600 hover:bg-emerald-700" },
  { status: "EXCUSED", label: "Entschuldigt", className: "bg-sky-600 hover:bg-sky-700" },
  { status: "UNEXCUSED", label: "Unentschuldigt", className: "bg-red-600 hover:bg-red-700" },
] as const;

/** Anwesenheitsliste eines Trainings mit 1-Klick-Bestätigung und Strafvorschlägen (REQ-ATT-02, REQ-PEN-02). */
export default async function TrainingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("TRAINER");
  const { id } = await params;
  const [{ session, rows }, pending] = await Promise.all([getAttendanceList(id), listPendingForSession(id)]);
  const isPast = session.startsAt < new Date();

  return (
    <>
      <div>
        <Link href="/trainer" className="text-sm text-emerald-800 hover:underline">
          ← Trainer-Dashboard
        </Link>
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <p className="text-sm text-gray-600">
          {formatDateTime(session.startsAt)} · {session.location}
        </p>
      </div>

      {pending.length > 0 && (
        <Card title="Strafvorschläge zur Freigabe">
          <ul className="divide-y">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium">{p.player.name}</p>
                  <p className="text-sm text-gray-600">
                    {p.rule.position ? `TSVK Pos. ${p.rule.position}: ` : ""}
                    {p.rule.title} · {formatEuro(p.amountCents)}
                  </p>
                </div>
                <div className="flex gap-2 text-sm font-medium">
                  <form action={approveAction}>
                    <input type="hidden" name="entryId" value={p.id} />
                    <input type="hidden" name="sessionId" value={session.id} />
                    <button className="rounded-lg bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800">Freigeben</button>
                  </form>
                  <form action={discardAction}>
                    <input type="hidden" name="entryId" value={p.id} />
                    <input type="hidden" name="sessionId" value={session.id} />
                    <button className="rounded-lg bg-gray-200 px-3 py-2 hover:bg-gray-300">Verwerfen</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={isPast ? "Anwesenheit bestätigen" : "Rückmeldungen"}>
        <ul className="divide-y">
          {rows.map(({ player, attendance }) => (
            <li key={player.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{player.name}</p>
                  {attendance?.note && <p className="text-xs text-gray-500">Grund: {attendance.note}</p>}
                </div>
                <Badge tone={attendanceTone(attendance?.status)}>{attendance ? ATTENDANCE_LABEL[attendance.status] : "Keine Antwort"}</Badge>
              </div>
              {isPast && (
                <form action={setAttendanceAction} className="mt-2 grid grid-cols-3 gap-2 text-xs font-medium text-white sm:text-sm">
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="playerId" value={player.id} />
                  {TRAINER_CHOICES.map((c) => (
                    <button
                      key={c.status}
                      name="status"
                      value={c.status}
                      className={`rounded-lg px-1 py-2 ${c.className} ${attendance?.status === c.status ? "ring-2 ring-offset-1 ring-gray-900" : "opacity-80"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
