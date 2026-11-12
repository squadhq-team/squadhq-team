import { can, requireMember } from "@/lib/auth";
import { formatDateTime, formatEuro } from "@/lib/format";
import { listRules } from "@/services/penaltyEngine";
import { listSquad } from "@/services/teamService";
import { listPast } from "@/services/attendanceService";
import { Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { manualPenaltyAction } from "../actions";

/** #46: Strafe aus dem Katalog per Hand vergeben (Verspätung, Karten, Ausrüstung …). */
export default async function ManualPenaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ spieler?: string; termin?: string }>;
}) {
  const user = await requireMember("strafen.vergeben");
  const sp = await searchParams;
  const [rules, squad, recent] = await Promise.all([
    listRules(user.teamId),
    listSquad(user.teamId),
    listPast(user.teamId, 10),
  ]);
  const usable = rules.filter((r) => r.active && r.amountCents > 0 && r.trigger !== "LATE_FEE");
  const direct = can(user, "strafen.freigeben");
  return (
    <>
      <PageHeader
        title="Strafe vergeben"
        subtitle={
          direct
            ? "Die Strafe ist sofort offen, Frist 7 Tage."
            : "Wird als Vorschlag angelegt; der Trainer gibt ihn frei."
        }
        back={{ href: "/kasse", label: "Kasse" }}
      />
      <Card>
        <ActionForm action={manualPenaltyAction} className="space-y-4">
          <Field label="Wer?">
            <select name="playerId" required defaultValue={sp.spieler ?? ""} className={inputClass}>
              <option value="" disabled>
                Mitglied wählen
              </option>
              {squad.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Wofür? (Strafenkatalog)">
            <select name="ruleId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Position wählen
              </option>
              {usable.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.position ? `${r.position}. ` : ""}
                  {r.title} · {formatEuro(r.amountCents)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Anzahl" hint="Bei „je Stück“, z. B. zwei vergessene Gegenstände = 2.">
            <input
              name="quantity"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
              className={`${inputClass} max-w-28`}
            />
          </Field>
          <Field label="Zu welchem Termin? (optional)">
            <select name="sessionId" defaultValue={sp.termin ?? ""} className={inputClass}>
              <option value="">ohne Termin</option>
              {recent.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} · {formatDateTime(s.startsAt)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notiz (optional)">
            <input name="note" placeholder="z. B. 12 Minuten zu spät" className={inputClass} />
          </Field>
          <SubmitButton className={`w-full ${btn.primary}`}>{direct ? "Strafe vergeben" : "Vorschlagen"}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
