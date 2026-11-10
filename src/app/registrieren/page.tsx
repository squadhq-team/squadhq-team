import Link from "next/link";
import { isEmailLoginEnabled } from "@/lib/auth";
import { Card, ErrorNotice, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { registerAction } from "../actions";

/** Registrierung: eigenes Konto bei Supabase Auth anlegen. Neue Konten sind Spieler. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Konto erstellen</h1>
        <p className="text-sm text-gray-600">Du wirst als Spieler angelegt. Trainer und Kassenwart vergibt das Team.</p>
      </div>
      <ErrorNotice message={fehler} />
      {!isEmailLoginEnabled() && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Die Registrierung ist auf diesem Server noch nicht eingerichtet.
        </p>
      )}
      <Card>
        <ActionForm action={registerAction} className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="font-medium">Name</span>
            <input name="name" autoComplete="name" required className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">E-Mail</span>
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">Passwort (mindestens 8 Zeichen)</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">Passwort wiederholen</span>
            <input
              name="passwordRepeat"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
          </label>
          <SubmitButton className="w-full rounded-lg bg-emerald-700 px-3 py-2.5 font-medium text-white hover:bg-emerald-800">
            Registrieren
          </SubmitButton>
        </ActionForm>
      </Card>
      <p className="text-center text-sm">
        Schon ein Konto?{" "}
        <Link href="/" className="text-emerald-800 hover:underline">
          Anmelden
        </Link>
      </p>
    </>
  );
}
