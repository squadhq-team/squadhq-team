import { requireMember } from "@/lib/auth";
import { ATTENDANCE_LABEL, PENALTY_LABEL, ROLE_LABEL, entryTitle, formatDateTime, formatEuro } from "@/lib/format";
import { AUDIT_ACTION_LABEL, listAuditLog, type AuditAction } from "@/services/auditService";
import { Card, EmptyState, PageHeader } from "@/components/ui";

/** Zeigt „PLAYER → CASHIER“ als „Spieler → Kassenwart“. */
const roleNote = (note: string) =>
  note.replace(/\b(TRAINER|ASSISTANT|CASHIER|PLAYER|GUARDIAN)\b/g, (r) => ROLE_LABEL[r as keyof typeof ROLE_LABEL]);

/**
 * Protokoll (REQ-AUD-01 / MVP-6): wer hat wann welche Strafe, Anwesenheit, Kassenbuchung oder Rolle geändert.
 * Nur lesen; die Einträge lassen sich weder ändern noch löschen (auch nicht in der Datenbank).
 */
export default async function AuditPage() {
  const user = await requireMember("protokoll.lesen");
  const entries = await listAuditLog(user.teamId);

  return (
    <>
      <PageHeader
        title="Protokoll"
        subtitle="Alle Änderungen an Strafen, Anwesenheiten, Kasse und Rollen, neueste zuerst. Einträge können nicht geändert oder gelöscht werden."
        back={{ href: "/kasse", label: "Kasse" }}
      />
      <Card>
        {entries.length === 0 && <EmptyState>Noch keine Einträge.</EmptyState>}
        <ul className="divide-y divide-stone-100 text-sm">
          {entries.map((e) => {
            const label = AUDIT_ACTION_LABEL[e.action as AuditAction] ?? e.action;
            let subject = "";
            let change = "";
            if (e.entry) {
              subject = `${e.entry.player.name} · ${entryTitle(e.entry)} (${formatEuro(e.entry.amountCents)})`;
              change = `${e.oldStatus ? PENALTY_LABEL[e.oldStatus] : "neu"} → ${e.newStatus ? PENALTY_LABEL[e.newStatus] : "?"}`;
            } else if (e.attendance) {
              subject = `${e.attendance.user.name} · ${e.attendance.session.title} am ${formatDateTime(e.attendance.session.startsAt)}`;
              change = `${e.oldAttendance ? ATTENDANCE_LABEL[e.oldAttendance] : "keine Antwort"} → ${e.newAttendance ? ATTENDANCE_LABEL[e.newAttendance] : "?"}`;
            } else if (e.transaction) {
              subject = `${e.transaction.direction === "INCOME" ? "Einnahme" : "Ausgabe"}: ${e.transaction.description} (${formatEuro(e.transaction.amountCents)})`;
            } else if (e.subject) {
              subject = e.subject.name;
            }
            return (
              <li key={e.id} className="py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="font-semibold">{label}</p>
                  <p className="text-xs text-stone-500">{formatDateTime(e.createdAt)}</p>
                </div>
                <p className="text-stone-700">{subject}</p>
                <p className="text-xs text-stone-500">
                  {change && `${change} · `}
                  {e.actor ? `von ${e.actor.name}` : "automatisch"}
                  {e.note && ` · ${roleNote(e.note)}`}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
