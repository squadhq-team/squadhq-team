import { requireMember } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { EventForm } from "@/components/EventForm";
import { createSessionAction } from "../actions";

/** MVP-1 (REQ-ATT-01): Trainer oder Betreuer legt einen Termin an; danach sagen die Spieler zu oder ab. */
export default async function NewEventPage() {
  await requireMember("termine.verwalten");
  return (
    <>
      <PageHeader title="Termin erstellen" back={{ href: "/termine", label: "Termine" }} />
      <Card>
        <EventForm action={createSessionAction} submitLabel="Termin erstellen" />
      </Card>
    </>
  );
}
