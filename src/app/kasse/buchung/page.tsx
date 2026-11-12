import { requireMember } from "@/lib/auth";
import { Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { addTransactionAction } from "../actions";

/** #53: Einnahme oder Ausgabe ins Kassenbuch eintragen. */
export default async function TransactionPage() {
  await requireMember("kasse.buchen");
  return (
    <>
      <PageHeader title="Einnahme oder Ausgabe" back={{ href: "/kasse?ansicht=kassenbuch", label: "Kassenbuch" }} />
      <Card>
        <ActionForm action={addTransactionAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "EXPENSE", l: "Ausgabe", c: "peer-checked:bg-red-700 peer-checked:ring-red-700" },
              { v: "INCOME", l: "Einnahme", c: "peer-checked:bg-brand-700 peer-checked:ring-brand-700" },
            ].map((o) => (
              <label key={o.v} className="cursor-pointer">
                <input
                  type="radio"
                  name="direction"
                  value={o.v}
                  defaultChecked={o.v === "EXPENSE"}
                  className="peer sr-only"
                />
                <span
                  className={`block rounded-xl py-3 text-center text-sm font-semibold ring-1 ring-stone-300 peer-checked:text-white ${o.c}`}
                >
                  {o.l}
                </span>
              </label>
            ))}
          </div>
          <Field label="Betrag in €">
            <input name="amount" inputMode="decimal" required placeholder="z. B. 18,50" className={inputClass} />
          </Field>
          <Field label="Wofür?">
            <input name="description" required placeholder="z. B. Getränke nach dem Heimspiel" className={inputClass} />
          </Field>
          <Field label="Datum" hint="Leer lassen = heute.">
            <input name="bookedAt" type="date" className={inputClass} />
          </Field>
          <SubmitButton className={`w-full ${btn.primary}`}>Buchen</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
