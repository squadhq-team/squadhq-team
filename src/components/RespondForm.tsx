/**
 * 1-Klick-Rückmeldung zu einem Termin (REQ-ATT-01): Dabei, Fehle, Unsicher, Verletzt, optional mit Grund.
 * Mit memberId sagt ein Stellvertreter für ein anderes Mitglied zu oder ab.
 */
import { ActionForm, SubmitButton } from "./SubmitButton";
import { inputClass } from "./ui";
import { respondAction } from "@/app/termine/actions";

const CHOICES = [
  { status: "ATTENDING", label: "Dabei", className: "bg-emerald-600 hover:bg-emerald-700" },
  { status: "EXCUSED", label: "Fehle", className: "bg-sky-600 hover:bg-sky-700" },
  { status: "UNSURE", label: "Unsicher", className: "bg-amber-500 hover:bg-amber-600" },
  { status: "INJURED", label: "Verletzt", className: "bg-violet-600 hover:bg-violet-700" },
] as const;

export function RespondForm({
  sessionId,
  memberId,
  current,
  note,
  showNote = true,
}: {
  sessionId: string;
  memberId?: string;
  current: string | null;
  note?: string | null;
  showNote?: boolean;
}) {
  return (
    <ActionForm action={respondAction} className="space-y-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      {memberId && <input type="hidden" name="memberId" value={memberId} />}
      <div className="grid grid-cols-4 gap-1.5 text-sm font-semibold text-white">
        {CHOICES.map((c) => (
          <SubmitButton
            key={c.status}
            name="status"
            value={c.status}
            current={current}
            className={`rounded-xl px-1 py-2.5 ${c.className}`}
          >
            {c.label}
          </SubmitButton>
        ))}
      </div>
      {showNote && (
        <input name="note" defaultValue={note ?? ""} placeholder="Grund (optional)" className={`${inputClass} py-2`} />
      )}
    </ActionForm>
  );
}
