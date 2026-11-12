import { Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { updatePasswordAction } from "../actions";

/** Neues Passwort setzen. Man kommt über den Link aus der Mail „Passwort vergessen“ hierher (dann ist man angemeldet). */
export default function NewPasswordPage() {
  return (
    <>
      <PageHeader title="Neues Passwort" subtitle="Mindestens 8 Zeichen." />
      <Card>
        <ActionForm action={updatePasswordAction} className="space-y-3">
          <Field label="Neues Passwort">
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
          <SubmitButton className={`w-full ${btn.primary}`}>Passwort speichern</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
