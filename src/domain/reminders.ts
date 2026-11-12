/**
 * #26 Erinnerung per E-Mail: Wer bekommt für einen Termin eine Mail? Reine Fachlogik, per Unit-Test prüfbar.
 * Regeln: Mitglieder ohne Rückmeldung bekommen eine Mail an die eigene Adresse, ihr Stellvertreter (Elternteil)
 * bekommt sie mit. Wer die E-Mail-Erinnerung im Profil abgeschaltet hat, bekommt keine. Testkonten (@squadhq.test)
 * und gelöschte Konten bekommen nie eine. Jede Adresse bekommt pro Termin höchstens eine Mail.
 */
import { isTestAccountEmail } from "./permissions";

export interface ReminderPerson {
  name: string;
  email: string | null;
  emailReminders: boolean;
  deletedAt?: Date | null;
}

export interface MissingMember extends ReminderPerson {
  managedBy?: ReminderPerson | null;
}

export interface ReminderMail {
  email: string;
  /** Name der Person, an die die Mail geht (für die Anrede) */
  name: string;
  /** Die Person selbst hat noch nicht geantwortet */
  self: boolean;
  /** Vertretene Mitglieder, für die noch eine Rückmeldung fehlt */
  forMembers: string[];
}

function reachable<T extends ReminderPerson>(p: T | null | undefined): p is T & { email: string } {
  return !!p && !!p.email && p.emailReminders && !p.deletedAt && !isTestAccountEmail(p.email);
}

export function reminderMails(missing: MissingMember[]): ReminderMail[] {
  const byEmail = new Map<string, ReminderMail>();
  const entry = (p: ReminderPerson & { email: string }) => {
    const key = p.email.trim().toLowerCase();
    let mail = byEmail.get(key);
    if (!mail) {
      mail = { email: p.email.trim(), name: p.name, self: false, forMembers: [] };
      byEmail.set(key, mail);
    }
    return mail;
  };
  for (const m of missing) {
    if (m.deletedAt) continue;
    if (reachable(m)) entry(m).self = true;
    const guardian = m.managedBy;
    if (reachable(guardian)) {
      const mail = entry(guardian);
      if (!mail.forMembers.includes(m.name)) mail.forMembers.push(m.name);
    }
  }
  return [...byEmail.values()];
}
