/**
 * ReminderService: Erinnerung vor der Rückmeldefrist (#26), läuft täglich per Vercel Cron (vercel.json).
 * Wer bei einem Termin mit Frist in den nächsten 30 Stunden noch nicht geantwortet hat, bekommt eine Push-Nachricht
 * und, wenn der Mailversand eingerichtet ist, eine E-Mail (Empfänger nach den Regeln in src/domain/reminders.ts).
 */
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { SQUAD_ROLES } from "@/domain/permissions";
import { reminderMails, type ReminderMail } from "@/domain/reminders";
import { notifyUsers, pushConfigured, type PushMessage } from "./pushService";
import { appUrl, createMailer, escapeHtml, type Mailer, type MailMessage } from "./mailService";

export interface ReminderDeps {
  push: (userIds: string[], message: PushMessage) => Promise<void>;
  pushEnabled: boolean;
  mailer: Mailer | null;
  baseUrl: string;
}

const PERSON = { name: true, email: true, emailReminders: true, deletedAt: true } as const;

export async function sendDeadlineReminders(now: Date = new Date(), deps?: Partial<ReminderDeps>) {
  const d: ReminderDeps = {
    push: deps?.push ?? notifyUsers,
    pushEnabled: deps?.pushEnabled ?? pushConfigured(),
    mailer: deps && "mailer" in deps ? (deps.mailer ?? null) : createMailer(),
    baseUrl: deps?.baseUrl ?? appUrl(),
  };
  const result = { push: 0, email: 0, emailFailed: 0 };
  if (!d.pushEnabled && !d.mailer) return result;
  try {
    const sessions = await prisma.trainingSession.findMany({
      where: {
        cancelledAt: null,
        startsAt: { gt: now },
        responseDeadline: { gt: now, lte: new Date(now.getTime() + 30 * 3600_000) },
      },
      include: { attendances: { select: { userId: true } } },
      orderBy: { startsAt: "asc" },
    });
    for (const s of sessions) {
      const answered = new Set(s.attendances.map((a) => a.userId));
      const missing = await prisma.user.findMany({
        where: { teamId: s.teamId, deletedAt: null, role: { in: SQUAD_ROLES }, id: { notIn: [...answered] } },
        select: { id: true, ...PERSON, managedBy: { select: PERSON } },
      });
      if (missing.length === 0) continue;
      if (d.pushEnabled) {
        await d.push(
          missing.map((m) => m.id),
          {
            title: "Bitte zu- oder absagen",
            body: `${s.title}: Rückmeldung bis ${formatDateTime(s.responseDeadline!)}`,
            url: `/termine/${s.id}`,
          },
        );
        result.push += missing.length;
      }
      if (d.mailer) {
        const mailer = d.mailer;
        const outcomes = await Promise.allSettled(
          reminderMails(missing).map((m) => mailer.send(reminderMessage(m, s, d.baseUrl))),
        );
        for (const o of outcomes) {
          if (o.status === "fulfilled") result.email++;
          else {
            result.emailFailed++;
            console.error("Erinnerungs-Mail fehlgeschlagen:", o.reason);
          }
        }
      }
    }
  } finally {
    if (!deps || !("mailer" in deps)) d.mailer?.close();
  }
  return result;
}

/** Text der Erinnerungs-Mail (Text- und HTML-Teil). */
export function reminderMessage(
  mail: ReminderMail,
  session: { id: string; title: string; startsAt: Date; responseDeadline: Date | null },
  baseUrl: string,
): MailMessage {
  const link = `${baseUrl}/termine/${session.id}`;
  const profile = `${baseUrl}/profil`;
  const when = formatDateTime(session.startsAt);
  const who = [...(mail.self ? ["dir"] : []), ...mail.forMembers];
  const whoText = who.length === 1 ? who[0] : `${who.slice(0, -1).join(", ")} und ${who[who.length - 1]}`;
  const deadline = session.responseDeadline
    ? `Die Rückmeldefrist endet ${formatDateTime(session.responseDeadline)}.`
    : "";
  const text = [
    `Hallo ${mail.name},`,
    "",
    `für „${session.title}“ am ${when} fehlt noch die Rückmeldung von ${whoText}. ${deadline}`.trim(),
    "",
    `Jetzt zu- oder absagen: ${link}`,
    "",
    "Viele Grüße",
    "SquadHQ",
    "",
    `Diese Erinnerung kannst du im Profil unter „Benachrichtigungen“ abschalten: ${profile}`,
  ].join("\n");
  const html = `<p>Hallo ${escapeHtml(mail.name)},</p>
<p>für „${escapeHtml(session.title)}“ am ${escapeHtml(when)} fehlt noch die Rückmeldung von ${escapeHtml(whoText)}. ${escapeHtml(deadline)}</p>
<p><a href="${escapeHtml(link)}">Jetzt zu- oder absagen</a></p>
<p>Viele Grüße<br>SquadHQ</p>
<p style="color:#78716c;font-size:12px">Diese Erinnerung kannst du im Profil unter „Benachrichtigungen“ abschalten: <a href="${escapeHtml(profile)}">${escapeHtml(profile)}</a></p>`;
  return { to: mail.email, subject: `Bitte zu- oder absagen: ${session.title} am ${when}`, text, html };
}
