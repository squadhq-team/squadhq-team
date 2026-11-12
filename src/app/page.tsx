import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor, isEmailLoginEnabled, listLoginUsers } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import { Avatar, Card, btn, inputClass } from "@/components/ui";
import { Logo } from "@/components/icons";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { login, loginWithPassword } from "./actions";

/** Einloggen: mit E-Mail und Passwort (Supabase Auth) oder per Demo-Anmeldung (Demo-Team) für Präsentationen. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const { code } = await searchParams;
  const users = await listLoginUsers();
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
      {users.length > 0 && (
        <Card title="Demo ansehen">
          <p className="mb-2 text-xs text-stone-500">
            Ohne Konto ausprobieren: eine Person aus dem Demo-Team wählen und die App aus ihrer Rolle sehen.
          </p>
          <ul className="divide-y divide-stone-100">
            {users.map((u) => (
              <li key={u.id}>
                <ActionForm action={login} className="flex items-center justify-between gap-2 py-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <span className="flex items-center gap-2">
                    <Avatar name={u.name} size="sm" />
                    <span>
                      <span className="block text-sm font-medium">{u.name}</span>
                      <span className="block text-xs text-stone-500">{ROLE_LABEL[u.role]}</span>
                    </span>
                  </span>
                  <SubmitButton className={`${btn.small} bg-stone-100 text-stone-800 hover:bg-stone-200`}>
                    Ansehen
                  </SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
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
