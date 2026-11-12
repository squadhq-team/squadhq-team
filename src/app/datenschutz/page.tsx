import { Card, PageHeader } from "@/components/ui";

/** Datenschutzhinweis für echte Nutzer (Studienprojekt). */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Datenschutz" back={{ href: "/", label: "Zurück" }} />
      <Card>
        <div className="space-y-3 text-sm leading-relaxed text-stone-700">
          <p>
            SquadHQ ist ein Studienprojekt im Modul Software-Projekt (WS 2026/27) an der Hochschule Flensburg.
            Verantwortlich ist das Projektteam SquadHQ.
          </p>
          <p>
            <strong>Welche Daten?</strong> Name, E-Mail-Adresse, freiwillig Telefonnummer, Position und Rückennummer;
            Zu- und Absagen, Anwesenheiten, Strafen, Zahlungen, Nachrichten im Team-Chat, Ankündigungen und
            Umfrage-Stimmen. Das Passwort speichert nur der Anmeldedienst (Supabase) verschlüsselt.
          </p>
          <p>
            <strong>Wer sieht was?</strong> Nur Mitglieder deines Teams. Kassenkonten sehen nur du selbst, Trainer und
            Kassenwart. Das Protokoll (wer hat wann welche Strafe geändert) sehen Trainer und Kassenwart.
          </p>
          <p>
            <strong>Wo?</strong> Datenbank und Anmeldung bei Supabase (Rechenzentrum in der EU, Stockholm), die App
            läuft bei Vercel. Push-Benachrichtigungen laufen über den Dienst deines Browsers (z. B. Google oder Apple),
            nur wenn du sie einschaltest.
          </p>
          <p>
            <strong>Löschen:</strong> Unter Profil → „Konto löschen“ entfernst du Name, Kontaktdaten und Anmeldung.
            Strafen bleiben anonym in der Kasse, damit sie für das Team nachvollziehbar bleibt.
          </p>
        </div>
      </Card>
    </>
  );
}
