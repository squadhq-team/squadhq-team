/**
 * PushService: Push-Benachrichtigungen aufs Handy (#26), z. B. neuer Termin, Absage, Ankündigung, Erinnerung vor der Frist
 * (die Erinnerung selbst plant der ReminderService).
 * Läuft nur, wenn VAPID_PUBLIC_KEY und VAPID_PRIVATE_KEY gesetzt sind (Anleitung: docs/setup.md); sonst passiert nichts.
 * Fehler beim Senden brechen nie die eigentliche Aktion ab.
 */
import webpush from "web-push";
import { prisma } from "@/lib/db";
import { SQUAD_ROLES } from "@/domain/permissions";

export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function pushConfigured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:squadhq@example.com", pub, priv);
  return true;
}

export async function saveSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  if (!sub.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth)
    throw new Error("Ungültige Push-Anmeldung.");
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function removeSubscription(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function hasSubscription(userId: string) {
  return (await prisma.pushSubscription.count({ where: { userId } })) > 0;
}

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}

/** An bestimmte Personen senden. Stellvertreter (Eltern) bekommen die Nachrichten ihrer Mitglieder mit. */
export async function notifyUsers(userIds: string[], message: PushMessage) {
  if (userIds.length === 0 || !pushConfigured()) return;
  try {
    const guardians = await prisma.user.findMany({
      where: { id: { in: userIds }, managedById: { not: null } },
      select: { managedById: true },
    });
    const ids = [...new Set([...userIds, ...guardians.map((g) => g.managedById!)])];
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(message),
            { TTL: 60 * 60 * 24 },
          );
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // Gerät hat die Benachrichtigungen abbestellt: Eintrag entfernen
          if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: s.id } });
        }
      }),
    );
  } catch (e) {
    console.error("Push-Benachrichtigung fehlgeschlagen:", e);
  }
}

/** An alle Mitglieder eines Teams (optional nur Kader, optional ohne den Absender). */
export async function notifyTeam(
  teamId: string,
  message: PushMessage,
  opts: { squadOnly?: boolean; exceptUserId?: string } = {},
) {
  if (!pushConfigured()) return;
  const members = await prisma.user.findMany({
    where: {
      teamId,
      deletedAt: null,
      ...(opts.squadOnly ? { role: { in: SQUAD_ROLES } } : {}),
      ...(opts.exceptUserId ? { id: { not: opts.exceptUserId } } : {}),
    },
    select: { id: true },
  });
  await notifyUsers(
    members.map((m) => m.id),
    message,
  );
}
