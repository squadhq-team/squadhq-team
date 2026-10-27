import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/format";
import { Card } from "@/components/ui";
import { login } from "./actions";

/** Demo-Anmeldung: Rolle per Klick wählen (Prototyp, ersetzt später Supabase Auth). */
export default async function LoginPage() {
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Willkommen bei SquadHQ</h1>
        <p className="text-sm text-gray-600">Prototyp P3 · Wähle eine Person, um die App aus ihrer Rolle zu sehen.</p>
      </div>
      <Card title="Demo-Anmeldung">
        <ul className="divide-y">
          {users.map((u) => (
            <li key={u.id}>
              <form action={login} className="flex items-center justify-between py-2">
                <input type="hidden" name="userId" value={u.id} />
                <span>
                  <span className="font-medium">{u.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{ROLE_LABEL[u.role]}</span>
                </span>
                <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">
                  Anmelden
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
