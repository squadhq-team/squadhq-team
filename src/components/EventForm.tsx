/** Formular zum Anlegen und Bearbeiten eines Termins (MVP-1, #47 Event-Typen, #48 Zusatzinfos). */
import { EVENT_TYPE_LABEL, toBerlinInputValue } from "@/lib/format";
import { ActionForm, SubmitButton } from "./SubmitButton";
import { Field, btn, inputClass } from "./ui";

type Values = {
  id?: string;
  type?: keyof typeof EVENT_TYPE_LABEL;
  title?: string;
  startsAt?: Date;
  responseDeadline?: Date | null;
  location?: string | null;
  meetingPoint?: string | null;
  meetingAt?: Date | null;
  tasks?: string | null;
  notes?: string | null;
  opponent?: string | null;
};

export function EventForm({
  action,
  values = {},
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  values?: Values;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      {values.id && <input type="hidden" name="sessionId" value={values.id} />}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Art des Termins</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {(Object.keys(EVENT_TYPE_LABEL) as (keyof typeof EVENT_TYPE_LABEL)[]).map((t) => (
            <label key={t} className="cursor-pointer">
              <input
                type="radio"
                name="type"
                value={t}
                defaultChecked={(values.type ?? "TRAINING") === t}
                className="peer sr-only"
              />
              <span className="block rounded-xl px-2 py-2.5 text-center text-sm font-medium ring-1 ring-stone-300 peer-checked:bg-ink peer-checked:text-white peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
                {EVENT_TYPE_LABEL[t]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Titel" hint="Leer lassen = Art des Termins, z. B. „Mannschaftstraining“.">
        <input name="title" defaultValue={values.title ?? ""} className={inputClass} />
      </Field>
      <Field label="Gegner" hint="Nur bei Spiel und Turnier.">
        <input
          name="opponent"
          defaultValue={values.opponent ?? ""}
          placeholder="z. B. TSV Altenholz"
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Beginn">
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toBerlinInputValue(values.startsAt)}
            className={inputClass}
          />
        </Field>
        <Field label="Rückmeldung bis" hint="Leer lassen = 3 Stunden vor Beginn.">
          <input
            name="responseDeadline"
            type="datetime-local"
            defaultValue={toBerlinInputValue(values.responseDeadline)}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Ort">
        <input
          name="location"
          defaultValue={values.location ?? ""}
          placeholder="z. B. Kunstrasen"
          className={inputClass}
        />
      </Field>
      <details
        className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200"
        open={Boolean(values.meetingPoint || values.meetingAt || values.tasks || values.notes)}
      >
        <summary className="cursor-pointer text-sm font-semibold">Zusatzinfos: Treffpunkt, Aufgaben, Notizen</summary>
        <div className="mt-3 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Treffpunkt">
              <input
                name="meetingPoint"
                defaultValue={values.meetingPoint ?? ""}
                placeholder="z. B. Kabine 2"
                className={inputClass}
              />
            </Field>
            <Field label="Treffen um">
              <input
                name="meetingAt"
                type="datetime-local"
                defaultValue={toBerlinInputValue(values.meetingAt)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Aufgaben" hint="Wer bringt was mit? Eine Aufgabe pro Zeile.">
            <textarea
              name="tasks"
              rows={3}
              defaultValue={values.tasks ?? ""}
              placeholder={"Bälle: Ben\nTrikots waschen: Can"}
              className={inputClass}
            />
          </Field>
          <Field label="Notiz an das Team">
            <textarea name="notes" rows={3} defaultValue={values.notes ?? ""} className={inputClass} />
          </Field>
        </div>
      </details>
      <SubmitButton className={`w-full ${btn.primary}`}>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
