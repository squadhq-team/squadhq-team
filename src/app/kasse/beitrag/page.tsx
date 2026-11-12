import { requireMember } from "@/lib/auth";
import { listSquad } from "@/services/teamService";
import { Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { createFeesAction } from "../actions";

/** Beitragsverwaltung: Kassenwart legt einen Beitrag für ausgewählte Mitglieder an (erscheint im Kassenkonto). */
export default async function FeePage() {
  const user = await requireMember("kasse.buchen");
  const squad = await listSquad(user.teamId);
  return (
    <>
      <PageHeader
        title="Beitrag anlegen"
        subtitle="z. B. Saisonbeitrag oder Anteil an der Mannschaftsfahrt."
        back={{ href: "/kasse", label: "Kasse" }}
      />
      <Card>
        <ActionForm action={createFeesAction} className="space-y-4">
          <Field label="Bezeichnung">
            <input name="title" required placeholder="z. B. Saisonbeitrag 2026/27" className={inputClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Betrag je Mitglied in €">
              <input name="amount" inputMode="decimal" required placeholder="z. B. 50" className={inputClass} />
            </Field>
            <Field label="Fällig am" hint="Leer lassen = in 7 Tagen.">
              <input name="dueDate" type="date" className={inputClass} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Für wen?</legend>
            <ul className="grid gap-1 sm:grid-cols-2">
              {squad.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50">
                    <input
                      type="checkbox"
                      name="playerId"
                      value={p.id}
                      defaultChecked
                      className="h-5 w-5 accent-brand-700"
                    />
                    {p.name}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <SubmitButton className={`w-full ${btn.primary}`}>Beitrag anlegen</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
