import { requireMember } from "@/lib/auth";
import { getSession } from "@/services/attendanceService";
import { Card, PageHeader } from "@/components/ui";
import { EventForm } from "@/components/EventForm";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { btn } from "@/components/ui";
import { cancelSessionAction, updateSessionAction } from "../../actions";

/** Termin bearbeiten oder absagen. */
export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireMember("termine.verwalten");
  const { id } = await params;
  const session = await getSession(user.teamId, id);
  return (
    <>
      <PageHeader title="Termin bearbeiten" back={{ href: `/termine/${id}`, label: "Zurück zum Termin" }} />
      <Card>
        <EventForm action={updateSessionAction} values={session} submitLabel="Änderungen speichern" />
      </Card>
      <Card title={session.cancelledAt ? "Termin ist abgesagt" : "Termin absagen"}>
        <p className="mb-3 text-sm text-stone-600">
          {session.cancelledAt
            ? "Das Team sieht den Termin durchgestrichen. Du kannst ihn wieder ansetzen."
            : "Der Termin bleibt durchgestrichen sichtbar, damit niemand umsonst kommt. Das Team bekommt eine Nachricht."}
        </p>
        <ActionForm action={cancelSessionAction}>
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="cancel" value={session.cancelledAt ? "0" : "1"} />
          <input type="hidden" name="back" value={`/termine/${session.id}`} />
          <SubmitButton className={session.cancelledAt ? btn.secondary : btn.danger}>
            {session.cancelledAt ? "Wieder ansetzen" : "Termin absagen"}
          </SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
