/**
 * Unit-Tests der Erinnerung per E-Mail (#26): Wer bekommt eine Mail, und was steht drin?
 */
import { describe, expect, it } from "vitest";
import { reminderMails } from "@/domain/reminders";
import { reminderMessage } from "@/services/reminderService";

const p = (name: string, email: string | null, emailReminders = true) => ({ name, email, emailReminders });

describe("#26 Erinnerung per E-Mail: Empfänger", () => {
  it("schreibt Mitgliedern ohne Rückmeldung an die eigene Adresse", () => {
    expect(reminderMails([p("Paul", "paul@example.com")])).toEqual([
      { email: "paul@example.com", name: "Paul", self: true, forMembers: [] },
    ]);
  });

  it("lässt abgeschaltete, fehlende, gelöschte Adressen und Testkonten aus", () => {
    expect(
      reminderMails([
        p("Aus", "aus@example.com", false),
        p("Ohne", null),
        { ...p("Weg", "weg@example.com"), deletedAt: new Date() },
        p("Test", "spieler@squadhq.test"),
      ]),
    ).toEqual([]);
  });

  it("schickt dem Stellvertreter eine Mail für alle vertretenen Mitglieder, je Adresse nur eine", () => {
    const mama = p("Mama", "Mama@Example.com");
    const mails = reminderMails([
      { ...p("Kind 1", null), managedBy: mama },
      { ...p("Kind 2", null), managedBy: { ...mama, email: "mama@example.com" } },
      { ...p("Mama", "mama@example.com"), managedBy: null },
    ]);
    expect(mails).toEqual([{ email: "Mama@Example.com", name: "Mama", self: true, forMembers: ["Kind 1", "Kind 2"] }]);
  });

  it("schreibt dem Stellvertreter nicht, wenn er die Erinnerung abgeschaltet hat", () => {
    expect(reminderMails([{ ...p("Kind", null), managedBy: p("Papa", "papa@example.com", false) }])).toEqual([]);
  });
});

describe("#26 Erinnerung per E-Mail: Inhalt", () => {
  const session = {
    id: "s1",
    title: "Training <Halle>",
    startsAt: new Date("2026-11-17T18:00:00Z"),
    responseDeadline: new Date("2026-11-16T17:00:00Z"),
  };

  it("nennt Termin, Frist, Link zum Termin und wie man die Erinnerung abschaltet", () => {
    const m = reminderMessage(
      { email: "paul@example.com", name: "Paul", self: true, forMembers: [] },
      session,
      "https://app.test",
    );
    expect(m.to).toBe("paul@example.com");
    expect(m.subject).toBe("Bitte zu- oder absagen: Training <Halle> am Di., 17.11., 19:00");
    expect(m.text).toContain("fehlt noch die Rückmeldung von dir.");
    expect(m.text).toContain("Die Rückmeldefrist endet Mo., 16.11., 18:00");
    expect(m.text).toContain("https://app.test/termine/s1");
    expect(m.text).toContain("https://app.test/profil");
    expect(m.html).toContain("Training &lt;Halle&gt;");
    expect(m.html).not.toContain("<Halle>");
  });

  it("zählt beim Stellvertreter die vertretenen Mitglieder auf", () => {
    const m = reminderMessage(
      { email: "mama@example.com", name: "Mama", self: true, forMembers: ["Kind 1", "Kind 2"] },
      session,
      "https://app.test",
    );
    expect(m.text).toContain("fehlt noch die Rückmeldung von dir, Kind 1 und Kind 2.");
  });
});
