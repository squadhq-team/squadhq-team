import { Card, ErrorNotice, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { updatePasswordAction } from "../actions";

/** Neues Passwort setzen. Man kommt über den Link aus der Mail „Passwort vergessen“ hierher (dann ist man angemeldet). */
export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Neues Passwort</h1>
        <p className="text-sm text-gray-600">Mindestens 8 Zeichen.</p>
      </div>
      <ErrorNotice message={fehler} />
      <Card>
        <ActionForm action={updatePasswordAction} className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="font-medium">Neues Passwort</span>
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
            Passwort speichern
          </SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
