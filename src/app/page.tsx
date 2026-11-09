import Link from "next/link";
import { listLoginUsers } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import { Card, ErrorNotice, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { login, loginWithPassword } from "./actions";

/** Einloggen: mit E-Mail und Passwort (registrierte Konten) oder per Demo-Anmeldung für die Präsentation. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  const users = await listLoginUsers();
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Willkommen bei SquadHQ</h1>
        <p className="text-sm text-gray-600">Trainingszusagen, Strafenkatalog und Teamkasse an einem Ort.</p>
      </div>
      <ErrorNotice message={fehler} />
      <Card title="Anmelden">
        <ActionForm action={loginWithPassword} className="space-y-3 text-sm">
          <input name="email" type="email" autoComplete="email" placeholder="E-Mail" required className={inputClass} />
          <input name="password" type="password" autoComplete="current-password" placeholder="Passwort" required className={inputClass} />
          <SubmitButton className="w-full rounded-lg bg-emerald-700 px-3 py-2.5 font-medium text-white hover:bg-emerald-800">Anmelden</SubmitButton>
        </ActionForm>
        <p className="mt-3 text-center text-sm">
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="text-emerald-800 hover:underline">
            Registrieren
          </Link>
        </p>
      </Card>
      <Card title="Demo-Anmeldung">
        <p className="mb-2 text-xs text-gray-500">Für die Präsentation: eine Person wählen, um die App aus ihrer Rolle zu sehen.</p>
        <ul className="divide-y">
          {users.map((u) => (
            <li key={u.id}>
              <ActionForm action={login} className="flex items-center justify-between py-2">
                <input type="hidden" name="userId" value={u.id} />
                <span>
                  <span className="font-medium">{u.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{ROLE_LABEL[u.role]}</span>
                </span>
                <SubmitButton className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">
                  Anmelden
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
