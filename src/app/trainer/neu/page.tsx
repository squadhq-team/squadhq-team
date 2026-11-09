import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card, ErrorNotice, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { createSessionAction } from "../../actions";

/** MVP-1 (REQ-ATT-01): Trainer legt ein neues Training an; danach können die Spieler zu- oder absagen. */
export default async function NewTrainingPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  await requireRole("TRAINER");
  const { fehler } = await searchParams;

  return (
    <>
      <div>
        <Link href="/trainer" className="text-sm text-emerald-800 hover:underline">
          ← Trainer-Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Training anlegen</h1>
      </div>
      <ErrorNotice message={fehler} />
      <Card>
        <ActionForm action={createSessionAction} className="space-y-3 text-sm">
          <Field label="Titel">
            <input name="title" defaultValue="Mannschaftstraining" className={inputClass} />
          </Field>
          <Field label="Beginn">
            <input name="startsAt" type="datetime-local" required className={inputClass} />
          </Field>
          <Field label="Ort">
            <input name="location" defaultValue="Kunstrasen Kronshagen" className={inputClass} />
          </Field>
          <Field label="Rückmeldung bis (optional)" hint="Leer lassen = 3 Stunden vor Beginn.">
            <input name="responseDeadline" type="datetime-local" className={inputClass} />
          </Field>
          <SubmitButton className="w-full rounded-lg bg-emerald-700 px-3 py-2.5 font-medium text-white hover:bg-emerald-800">
            Training anlegen
          </SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
