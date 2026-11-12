import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor, isEmailLoginEnabled } from "@/lib/auth";
import { Card, btn, inputClass } from "@/components/ui";
import { Logo } from "@/components/icons";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { loginWithPassword } from "./actions";

/** Einloggen mit E-Mail und Passwort (Supabase Auth). Zum Ausprobieren: Testkonten aus der README. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const { code } = await searchParams;
  const emailLogin = isEmailLoginEnabled();
  return (
    <>
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <Logo className="h-16 w-16 drop-shadow" />
        <h1 className="text-2xl font-bold tracking-tight">Willkommen bei SquadHQ</h1>
        <p className="max-w-sm text-sm text-stone-600">
          Termine, Zu- und Absagen, Strafenkatalog und Teamkasse deiner Mannschaft an einem Ort.
        </p>
      </div>
      {!emailLogin && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Die Anmeldung mit E-Mail ist auf diesem Server noch nicht eingerichtet (SUPABASE_URL und SUPABASE_ANON_KEY
          fehlen).
        </p>
      )}
      {emailLogin && (
        <Card title="Anmelden">
          <ActionForm action={loginWithPassword} className="space-y-3">
            {code && <input type="hidden" name="code" value={code} />}
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="E-Mail"
              required
              className={inputClass}
            />
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Passwort"
              required
              className={inputClass}
            />
            <SubmitButton className={`w-full ${btn.primary}`}>Anmelden</SubmitButton>
          </ActionForm>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link href="/passwort-vergessen" className="font-medium text-brand-700 hover:underline">
              Passwort vergessen?
            </Link>
            <Link
              href={code ? `/registrieren?code=${encodeURIComponent(code)}` : "/registrieren"}
              className={btn.secondary}
            >
              Neues Konto erstellen
            </Link>
          </div>
        </Card>
      )}
      <p className="text-center text-xs text-stone-500">
        <Link href="/datenschutz" className="hover:underline">
          Datenschutz
        </Link>
      </p>
    </>
  );
}
