import { requireMember } from "@/lib/auth";
import { Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { createPollAction } from "../actions";

/** #50: Umfrage anlegen (z. B. Mannschaftsfeier, Essensbestellung). */
export default async function NewPollPage() {
  await requireMember("news.schreiben");
  return (
    <>
      <PageHeader title="Umfrage starten" back={{ href: "/neuigkeiten", label: "Neuigkeiten" }} />
      <Card>
        <ActionForm action={createPollAction} className="space-y-4">
          <Field label="Frage">
            <input
              name="question"
              required
              placeholder="z. B. Wohin geht die Mannschaftsfahrt?"
              className={inputClass}
            />
          </Field>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Antworten (mindestens zwei)</legend>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <input
                key={i}
                name="option"
                required={i <= 2}
                placeholder={`Antwort ${i}${i > 2 ? " (optional)" : ""}`}
                className={inputClass}
              />
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="multiple" className="h-5 w-5 accent-brand-700" />
            Mehrere Antworten erlauben
          </label>
          <Field label="Läuft bis (optional)">
            <input name="closesAt" type="datetime-local" className={inputClass} />
          </Field>
          <SubmitButton className={`w-full ${btn.primary}`}>Umfrage starten</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
