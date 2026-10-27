import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { listSessions } from "@/services/attendanceService";
import { Badge, Card } from "@/components/ui";

/** Trainer-Dashboard: Übersicht aller Trainings mit Stand der Rückmeldungen (REQ-ATT-02). */
export default async function TrainerPage() {
  await requireRole("TRAINER");
  const sessions = await listSessions();
  const now = new Date();
  const upcoming = sessions.filter((s) => s.startsAt >= now).reverse();
  const past = sessions.filter((s) => s.startsAt < now);

  const row = (s: (typeof sessions)[number]) => {
    const count = (st: string) => s.attendances.filter((a) => a.status === st).length;
    return (
      <li key={s.id}>
        <Link href={`/trainer/training/${s.id}`} className="flex items-center justify-between gap-2 py-3 hover:bg-gray-50">
          <div>
            <p className="font-medium">{s.title}</p>
            <p className="text-sm text-gray-600">{formatDateTime(s.startsAt)}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            <Badge tone="green">{count("ATTENDING")} dabei</Badge>
            <Badge tone="blue">{count("EXCUSED")} entsch.</Badge>
            <Badge tone="amber">{count("UNSURE")} unsicher</Badge>
            {count("UNEXCUSED") > 0 && <Badge tone="red">{count("UNEXCUSED")} unentsch.</Badge>}
          </div>
        </Link>
      </li>
    );
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Trainer-Dashboard</h1>
      <Card title="Kommende Trainings">
        <ul className="divide-y">{upcoming.map(row)}</ul>
      </Card>
      <Card title="Vergangene Trainings: Anwesenheit bestätigen">
        <ul className="divide-y">{past.map(row)}</ul>
      </Card>
    </>
  );
}
