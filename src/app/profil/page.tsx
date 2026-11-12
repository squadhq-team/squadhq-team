import Link from "next/link";
import { isEmailLoginEnabled, isInDemoTeam, requireUser } from "@/lib/auth";
import { ROLE_HINT, ROLE_LABEL } from "@/lib/format";
import { pushPublicKey } from "@/services/pushService";
import { Avatar, Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { PushToggle } from "@/components/PushToggle";
import { deleteAccountAction, leaveTeamAction, logout, updatePasswordAction, updateProfileAction } from "../actions";

/** Mein Profil (#51): Name, Kontakt, Position; Passwort ändern, Benachrichtigungen, Team verlassen, Konto löschen. */
export default async function ProfilePage() {
  const user = await requireUser();
  const demo = await isInDemoTeam(user);
  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <PageHeader title={user.name} subtitle={`${ROLE_LABEL[user.role]}${user.email ? ` · ${user.email}` : ""}`} />
      </div>
      {user.teamId && <p className="text-sm text-stone-600">Deine Rolle: {ROLE_HINT[user.role]}.</p>}

      <Card title="Profil">
        <ActionForm action={updateProfileAction} className="space-y-3">
          <Field label="Name">
            <input name="name" defaultValue={user.name} required className={inputClass} />
          </Field>
          <Field label="Telefon (für das Team sichtbar, optional)">
            <input name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" className={inputClass} />
          </Field>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field label="Position">
              <input
                name="position"
                defaultValue={user.position ?? ""}
                placeholder="z. B. Abwehr"
                className={inputClass}
              />
            </Field>
            <Field label="Rückennr.">
              <input
                name="shirtNumber"
                type="number"
                min={1}
                max={99}
                defaultValue={user.shirtNumber ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <SubmitButton className={btn.primary}>Speichern</SubmitButton>
        </ActionForm>
      </Card>

      {user.teamId && (
        <Card title="Benachrichtigungen">
          <p className="mb-3 text-sm text-stone-600">
            Neue Termine, Absagen, Ankündigungen und Erinnerungen vor der Rückmeldefrist.
          </p>
          <PushToggle publicKey={pushPublicKey()} />
        </Card>
      )}

      {user.authId && !demo && isEmailLoginEnabled() && (
        <Card title="Passwort ändern">
          <ActionForm action={updatePasswordAction} className="space-y-3">
            <input type="hidden" name="back" value="/profil" />
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Neues Passwort"
              className={inputClass}
            />
            <input
              name="passwordRepeat"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Wiederholen"
              className={inputClass}
            />
            <SubmitButton className={btn.secondary}>Passwort ändern</SubmitButton>
          </ActionForm>
        </Card>
      )}

      <form action={logout}>
        <button className={`w-full ${btn.secondary}`}>Abmelden</button>
      </form>

      <Card title="Team und Konto">
        {demo && (
          <p className="text-sm text-stone-600">
            Das ist ein Konto im Demo-Team zum Ausprobieren. Passwort ändern, Team verlassen und Konto löschen sind hier
            abgeschaltet, damit es für alle gleich bleibt. Für ein eigenes Team bitte registrieren.
          </p>
        )}
        {user.teamId && !demo && (
          <ActionForm action={leaveTeamAction} className="mb-4">
            <p className="mb-2 text-sm text-stone-600">
              Du verlässt das Team. Offene Beträge bleiben in der Kasse stehen.
            </p>
            <SubmitButton className={btn.danger}>Team verlassen</SubmitButton>
          </ActionForm>
        )}
        {user.authId && !demo && (
          <ActionForm action={deleteAccountAction} className="space-y-2 border-t border-stone-100 pt-4">
            <p className="text-sm text-stone-600">
              Konto löschen: Name, E-Mail, Telefon und Anmeldung werden entfernt. Strafen bleiben anonym als „Gelöschtes
              Mitglied“ in der Kasse, damit sie nachvollziehbar bleibt.
            </p>
            <input name="confirm" placeholder="Zur Bestätigung LÖSCHEN eingeben" className={inputClass} />
            <SubmitButton className={btn.danger}>Konto endgültig löschen</SubmitButton>
          </ActionForm>
        )}
      </Card>
      <p className="text-center text-xs text-stone-500">
        <Link href="/datenschutz" className="hover:underline">
          Datenschutz
        </Link>
      </p>
    </>
  );
}
