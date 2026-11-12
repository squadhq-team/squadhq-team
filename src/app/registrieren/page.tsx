import Link from "next/link";
import { isEmailLoginEnabled } from "@/lib/auth";
import { Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { registerAction } from "../actions";

/** Registrierung: eigenes Konto bei Supabase Auth. Mit Team-Code (aus der Einladung) direkt im Team. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <>
      <PageHeader
        title="Konto erstellen"
        subtitle={
          code
            ? "Nach dem Registrieren bist du direkt in deinem Team."
            : "Danach gründest du ein Team oder trittst mit dem Team-Code deiner Mannschaft bei."
        }
      />
      {!isEmailLoginEnabled() && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Die Registrierung ist auf diesem Server noch nicht eingerichtet.
        </p>
      )}
      <Card>
        <ActionForm action={registerAction} className="space-y-3">
          <Field label="Vor- und Nachname">
            <input name="name" autoComplete="name" required className={inputClass} />
          </Field>
          <Field
            label="E-Mail"
            hint="Du bekommst eine Mail zur Bestätigung. Sie landet manchmal im Spam-Ordner, schau dann bitte dort nach."
          >
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </Field>
          <Field label="Passwort" hint="Mindestens 8 Zeichen.">
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Passwort wiederholen">
            <input
              name="passwordRepeat"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Team-Code (falls du einen hast)" hint="Bekommst du von deinem Trainer, z. B. K7M2QX.">
            <input
              name="code"
              defaultValue={code ?? ""}
              autoCapitalize="characters"
              autoComplete="off"
              className={`${inputClass} uppercase tracking-widest`}
            />
          </Field>
          <p className="text-xs text-stone-500">
            Mit dem Registrieren stimmst du der Verarbeitung deiner Daten laut{" "}
            <Link href="/datenschutz" className="text-brand-700 underline">
              Datenschutzhinweis
            </Link>{" "}
            zu.
          </p>
          <SubmitButton className={`w-full ${btn.primary}`}>Registrieren</SubmitButton>
        </ActionForm>
      </Card>
      <p className="text-center text-sm">
        Schon ein Konto?{" "}
        <Link
          href={code ? `/?code=${encodeURIComponent(code)}` : "/"}
          className="font-medium text-brand-700 hover:underline"
        >
          Anmelden
        </Link>
      </p>
    </>
  );
}
