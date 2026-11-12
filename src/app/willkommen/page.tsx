import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { createTeamAction, joinTeamAction, logout } from "../actions";

/** Nach der Registrierung: mit Team-Code beitreten (Spieler) oder ein neues Team gründen (Trainer). */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await requireUser();
  if (user.teamId) redirect("/start");
  const { code } = await searchParams;
  return (
    <>
      <PageHeader title={`Hallo ${user.name.split(" ")[0]}!`} subtitle="Wie geht es los?" />
      <Card title="Einem Team beitreten">
        <p className="mb-3 text-sm text-stone-600">Den Team-Code bekommst du von deinem Trainer.</p>
        <ActionForm action={joinTeamAction} className="space-y-3">
          <Field label="Team-Code">
            <input
              name="code"
              defaultValue={code ?? ""}
              required
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="z. B. K7M2QX"
              className={`${inputClass} text-center text-lg font-semibold uppercase tracking-[0.3em]`}
            />
          </Field>
          <SubmitButton className={`w-full ${btn.primary}`}>Beitreten</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Neues Team gründen">
        <p className="mb-3 text-sm text-stone-600">
          Für Trainer: Du wirst Trainer des Teams und bekommst einen Team-Code für deine Spieler. Der
          TSVK-Strafenkatalog ist als Vorlage dabei und lässt sich anpassen.
        </p>
        <ActionForm action={createTeamAction} className="space-y-3">
          <Field label="Name des Teams">
            <input
              name="name"
              required
              minLength={3}
              placeholder="z. B. TSV Kronshagen 1. Herren"
              className={inputClass}
            />
          </Field>
          <SubmitButton className={`w-full ${btn.secondary}`}>Team gründen</SubmitButton>
        </ActionForm>
      </Card>
      <form action={logout} className="text-center">
        <button className="text-sm text-stone-500 hover:underline">Abmelden</button>
      </form>
    </>
  );
}
