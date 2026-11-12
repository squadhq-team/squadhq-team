import Link from "next/link";
import { Card, Field, PageHeader, SpamHint, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { requestPasswordResetAction } from "../actions";

/** Passwort vergessen: E-Mail eingeben, Supabase schickt einen Link zum Zurücksetzen. */
export default function ForgotPasswordPage() {
  return (
    <>
      <PageHeader
        title="Passwort vergessen"
        subtitle="Wir schicken dir eine Mail mit einem Link, über den du ein neues Passwort setzt."
        back={{ href: "/", label: "Anmelden" }}
      />
      <Card>
        <ActionForm action={requestPasswordResetAction} className="space-y-3">
          <Field label="E-Mail">
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </Field>
          <SubmitButton className={`w-full ${btn.primary}`}>Link schicken</SubmitButton>
        </ActionForm>
      </Card>
      <SpamHint />
      <p className="text-center text-sm">
        <Link href="/" className="font-medium text-brand-700 hover:underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </>
  );
}
