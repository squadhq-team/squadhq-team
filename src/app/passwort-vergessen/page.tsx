import Link from "next/link";
import { Card, ErrorNotice, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { requestPasswordResetAction } from "../actions";

/** Passwort vergessen: E-Mail eingeben, Supabase schickt einen Link zum Zurücksetzen. */
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Passwort vergessen</h1>
        <p className="text-sm text-gray-600">
          Wir schicken dir eine Mail mit einem Link, über den du ein neues Passwort setzt.
        </p>
      </div>
      <ErrorNotice message={fehler} />
      <Card>
        <ActionForm action={requestPasswordResetAction} className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="font-medium">E-Mail</span>
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </label>
          <SubmitButton className="w-full rounded-lg bg-emerald-700 px-3 py-2.5 font-medium text-white hover:bg-emerald-800">
            Link anfordern
          </SubmitButton>
        </ActionForm>
      </Card>
      <p className="text-center text-sm">
        <Link href="/" className="text-emerald-800 hover:underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </>
  );
}
