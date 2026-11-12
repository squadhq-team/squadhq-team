import { requireMember } from "@/lib/auth";
import { EVENT_TYPE_LABEL } from "@/lib/format";
import { Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { importCalendarAction } from "../actions";

/** Spielplan-Import: Termine aus einer Kalenderdatei (.ics) oder einem Kalender-Abo übernehmen. */
export default async function ImportPage() {
  await requireMember("termine.verwalten");
  return (
    <>
      <PageHeader
        title="Spielplan importieren"
        subtitle="Termine aus einem Kalender übernehmen, z. B. dem Spielplan von fussball.de."
        back={{ href: "/termine", label: "Termine" }}
      />
      <Card>
        <ActionForm action={importCalendarAction} className="space-y-4">
          <Field label="Kalenderdatei (.ics)">
            <input name="file" type="file" accept=".ics,text/calendar" className={`${inputClass} py-2`} />
          </Field>
          <p className="text-center text-xs font-semibold uppercase text-stone-400">oder</p>
          <Field
            label="Adresse des Kalender-Abos"
            hint="Beginnt mit https:// oder webcal://, z. B. aus „Spielplan abonnieren“."
          >
            <input name="url" type="url" inputMode="url" placeholder="https://…" className={inputClass} />
          </Field>
          <Field label="Termine anlegen als">
            <select name="type" defaultValue="GAME" className={inputClass}>
              {(Object.keys(EVENT_TYPE_LABEL) as (keyof typeof EVENT_TYPE_LABEL)[]).map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <SubmitButton className={`w-full ${btn.primary}`}>Importieren</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="So geht es mit fussball.de">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700">
          <li>Auf fussball.de die Mannschaft öffnen und zum Spielplan gehen.</li>
          <li>„Spielplan als Kalender exportieren“ bzw. „abonnieren“ wählen.</li>
          <li>Die .ics-Datei hier hochladen oder die Abo-Adresse einfügen.</li>
        </ol>
        <p className="mt-2 text-xs text-stone-500">
          Nur zukünftige Termine werden übernommen. Ein erneuter Import aktualisiert schon übernommene Spiele, statt sie
          doppelt anzulegen.
        </p>
      </Card>
    </>
  );
}
