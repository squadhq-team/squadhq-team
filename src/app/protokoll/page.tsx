import { requireRole } from "@/lib/auth";
import { ATTENDANCE_LABEL, PENALTY_LABEL, formatDateTime, formatEuro } from "@/lib/format";
import { AUDIT_ACTION_LABEL, listAuditLog, type AuditAction } from "@/services/auditService";
import { Card } from "@/components/ui";

/**
 * Protokoll (REQ-AUD-01 / MVP-6): wer hat wann welche Strafe oder Anwesenheit geändert.
 * Nur lesen; die Einträge lassen sich weder ändern noch löschen (auch nicht in der Datenbank).
 */
export default async function AuditPage() {
  await requireRole("TRAINER", "CASHIER");
  const entries = await listAuditLog();

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Protokoll</h1>
        <p className="text-sm text-gray-600">
          Alle Änderungen an Strafen und alle vom Trainer gesetzten Anwesenheiten, neueste zuerst. Einträge können nicht
          geändert oder gelöscht werden.
        </p>
      </div>
      <Card>
        {entries.length === 0 && <p className="text-sm text-gray-500">Noch keine Einträge.</p>}
        <ul className="divide-y text-sm">
          {entries.map((e) => {
            const label = AUDIT_ACTION_LABEL[e.action as AuditAction] ?? e.action;
            let subject = "";
            let change = "";
            if (e.entry) {
              subject = `${e.entry.player.name} · ${e.entry.rule.title} (${formatEuro(e.entry.amountCents)})`;
              change = `${e.oldStatus ? PENALTY_LABEL[e.oldStatus] : "neu"} → ${e.newStatus ? PENALTY_LABEL[e.newStatus] : "?"}`;
            } else if (e.attendance) {
              subject = `${e.attendance.user.name} · ${e.attendance.session.title} am ${formatDateTime(e.attendance.session.startsAt)}`;
              change = `${e.oldAttendance ? ATTENDANCE_LABEL[e.oldAttendance] : "keine Antwort"} → ${e.newAttendance ? ATTENDANCE_LABEL[e.newAttendance] : "?"}`;
            }
            return (
              <li key={e.id} className="py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(e.createdAt)}</p>
                </div>
                <p className="text-gray-700">{subject}</p>
                <p className="text-xs text-gray-500">
                  {change} · von {e.actor.name}
                  {e.note && ` · ${e.note}`}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
