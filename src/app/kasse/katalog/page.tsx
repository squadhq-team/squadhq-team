import { can, requireMember } from "@/lib/auth";
import { formatEuro } from "@/lib/format";
import { listRules } from "@/services/penaltyEngine";
import { Badge, Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { addRuleAction, updateRuleAction } from "../actions";

const TRIGGER_HINT: Record<string, string> = {
  UNEXCUSED_ABSENCE: "automatisch bei unentschuldigtem Fehlen im Training",
  UNEXCUSED_GAME: "automatisch bei unentschuldigtem Fehlen bei Spiel/Turnier",
  LATE_FEE: "automatisch je Woche Zahlungsverzug",
  LATE: "per Hand (Verspätung)",
  MANUAL: "per Hand",
};

/** REQ-PEN-01: Strafenkatalog des Teams. Alle sehen ihn (Transparenz), Trainer und Kassenwart pflegen ihn. */
export default async function CatalogPage() {
  const user = await requireMember();
  const rules = await listRules(user.teamId);
  const edit = can(user, "katalog.pflegen");
  return (
    <>
      <PageHeader
        title="Strafenkatalog"
        subtitle={
          edit
            ? "Änderungen gelten für neue Strafen, bestehende bleiben unverändert."
            : "Diese Regeln gelten in deinem Team."
        }
        back={{ href: "/kasse", label: "Kasse" }}
      />
      <Card>
        <ul className="divide-y divide-stone-100">
          {rules.map((r) => (
            <li key={r.id} className={`py-3 ${r.active ? "" : "opacity-60"}`}>
              {edit ? (
                <details>
                  <summary className="flex cursor-pointer items-start justify-between gap-2">
                    <RuleText rule={r} />
                  </summary>
                  <ActionForm action={updateRuleAction} className="mt-3 space-y-3 rounded-xl bg-stone-50 p-3">
                    <input type="hidden" name="ruleId" value={r.id} />
                    <Field label="Bezeichnung">
                      <input name="title" defaultValue={r.title} required className={inputClass} />
                    </Field>
                    <div className="flex flex-wrap items-end gap-3">
                      <Field label="Betrag in €">
                        <input
                          name="amount"
                          inputMode="decimal"
                          defaultValue={(r.amountCents / 100).toFixed(2).replace(".", ",")}
                          className={`${inputClass} max-w-32`}
                        />
                      </Field>
                      <label className="flex items-center gap-2 pb-3 text-sm">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={r.active}
                          className="h-5 w-5 accent-brand-700"
                        />
                        aktiv
                      </label>
                    </div>
                    <SubmitButton className={`${btn.small} bg-ink text-white`}>Speichern</SubmitButton>
                  </ActionForm>
                </details>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <RuleText rule={r} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
      {edit && (
        <Card title="Eigene Regel ergänzen">
          <ActionForm action={addRuleAction} className="space-y-3">
            <Field label="Bezeichnung">
              <input name="title" required placeholder="z. B. Schienbeinschoner vergessen" className={inputClass} />
            </Field>
            <Field label="Betrag in €">
              <input
                name="amount"
                inputMode="decimal"
                required
                placeholder="z. B. 3"
                className={`${inputClass} max-w-32`}
              />
            </Field>
            <SubmitButton className={btn.primary}>Ergänzen</SubmitButton>
          </ActionForm>
        </Card>
      )}
    </>
  );
}

function RuleText({
  rule,
}: {
  rule: { position: number | null; title: string; amountCents: number; trigger: string; active: boolean };
}) {
  return (
    <>
      <span className="min-w-0">
        <span className="block text-sm font-medium">
          {rule.position ? `${rule.position}. ` : ""}
          {rule.title}
        </span>
        <span className="block text-xs text-stone-500">{TRIGGER_HINT[rule.trigger]}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-semibold">{rule.amountCents > 0 ? formatEuro(rule.amountCents) : "Sachstrafe"}</span>
        {!rule.active && <Badge tone="gray">inaktiv</Badge>}
      </span>
    </>
  );
}
