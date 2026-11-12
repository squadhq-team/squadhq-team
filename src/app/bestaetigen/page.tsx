import Link from "next/link";
import { Card, PageHeader, SpamHint, btn } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { resendConfirmationAction } from "../actions";

/** Nach dem Registrieren: Hinweis auf die Bestätigungsmail, mit „Mail erneut senden“. */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <>
      <PageHeader title="Fast geschafft" subtitle="Bitte bestätige deine E-Mail-Adresse." />
      <Card>
        <p className="text-sm">
          Wir haben dir eine Mail{email ? ` an ${email}` : ""} geschickt. Tippe auf den Link darin, dann bist du
          angemeldet.
        </p>
        <div className="mt-3">
          <SpamHint />
        </div>
        <p className="mt-3 text-sm text-stone-600">Immer noch nichts da? Dann lass sie dir noch einmal schicken.</p>
        {email && (
          <ActionForm action={resendConfirmationAction} className="mt-4">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="back" value={`/bestaetigen?email=${encodeURIComponent(email)}`} />
            <SubmitButton className={btn.secondary}>Mail erneut senden</SubmitButton>
          </ActionForm>
        )}
      </Card>
      <p className="text-center text-sm">
        <Link href="/" className="font-medium text-brand-700 hover:underline">
          Zur Anmeldung
        </Link>
      </p>
    </>
  );
}
