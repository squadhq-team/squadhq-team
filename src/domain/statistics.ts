/**
 * Statistik (#30, #65): Leistungsbewertung nach dem Training, Top-Strafen und Kassenverlauf.
 * Reine Rechenregeln ohne Datenbank, damit sie per Unit-Test prüfbar sind (tests/statistics.test.ts).
 * Die Beteiligungsquote steht bei den Strafen-Regeln (participationRate in src/domain/penalties.ts).
 */
import type { AttendanceStatus, EventType } from "./penalties";

/** Sterne einer Leistungsbewertung: 1 (schwach) bis 5 (sehr stark). */
export const RATING_MIN = 1;
export const RATING_MAX = 5;
/** Höchstlänge der Notiz zur Bewertung (Zeichen). */
export const RATING_NOTE_MAX = 500;
/** Termin-Typen, nach denen bewertet werden kann (Wunsch Team 16.11.: Leistung im Training). */
export const RATABLE_EVENT_TYPES: EventType[] = ["TRAINING"];

/**
 * Darf diese Bewertung gespeichert werden? Liefert die Fehlermeldung oder null.
 * Bewertet wird nur nach einem stattgefundenen (begonnenen, nicht abgesagten) Training
 * und nur, wer laut Anwesenheit dabei war. Sterne ganzzahlig 1–5, Notiz höchstens 500 Zeichen.
 */
export function ratingProblem(
  params: {
    eventType: EventType;
    startsAt: Date;
    cancelledAt: Date | null;
    attendance: AttendanceStatus | null;
    stars: number;
    note?: string | null;
  },
  now: Date = new Date(),
): string | null {
  if (!RATABLE_EVENT_TYPES.includes(params.eventType)) return "Bewerten kannst du nur nach einem Training.";
  if (params.cancelledAt) return "Dieses Training wurde abgesagt.";
  if (params.startsAt > now) return "Bewerten geht erst, wenn das Training begonnen hat.";
  if (params.attendance !== "ATTENDING") return "Bewerten kannst du nur, wer beim Training dabei war.";
  if (!Number.isInteger(params.stars) || params.stars < RATING_MIN || params.stars > RATING_MAX)
    return `Bitte ${RATING_MIN} bis ${RATING_MAX} Sterne wählen.`;
  if ((params.note?.trim().length ?? 0) > RATING_NOTE_MAX)
    return `Die Notiz darf höchstens ${RATING_NOTE_MAX} Zeichen lang sein.`;
  return null;
}

export type Trend = "UP" | "DOWN" | "FLAT";

/** Wie viele der letzten Bewertungen für den Trend verglichen werden (letzte 3 gegen die 3 davor). */
export const TREND_WINDOW = 3;
/** Ab diesem Unterschied im Schnitt (Sterne) gilt es als Auf- bzw. Abwärtstrend. */
export const TREND_THRESHOLD = 0.5;

/**
 * Leistung eines Spielers aus seinen Bewertungen:
 * - Schnitt über alle Bewertungen (null ohne Bewertung)
 * - Schnitt der letzten 3 Bewertungen
 * - Trend: letzte 3 gegen die 3 davor; erst ab 4 Bewertungen, sonst null (zu wenig für eine Aussage)
 */
export function ratingSummary(ratings: { stars: number; at: Date }[]): {
  count: number;
  average: number | null;
  recentAverage: number | null;
  trend: Trend | null;
} {
  const sorted = [...ratings].sort((a, b) => a.at.getTime() - b.at.getTime());
  const avg = (xs: { stars: number }[]) => (xs.length ? xs.reduce((s, r) => s + r.stars, 0) / xs.length : null);
  const recent = sorted.slice(-TREND_WINDOW);
  const before = sorted.slice(-2 * TREND_WINDOW, -TREND_WINDOW);
  let trend: Trend | null = null;
  if (sorted.length > TREND_WINDOW) {
    const diff = avg(recent)! - avg(before)!;
    trend = diff >= TREND_THRESHOLD ? "UP" : diff <= -TREND_THRESHOLD ? "DOWN" : "FLAT";
  }
  return { count: sorted.length, average: avg(sorted), recentAverage: avg(recent), trend };
}

/**
 * Top-Strafen: welche Katalogpositionen am häufigsten vergeben wurden, mit Anzahl und Summe.
 * Es zählen nur freigegebene Strafen (keine Vorschläge, keine stornierten), keine Mahngebühren und Beiträge.
 * Sortiert nach Anzahl, bei Gleichstand nach Summe, dann nach Titel.
 */
export function topPenalties(
  entries: {
    kind: "PENALTY" | "LATE_FEE" | "FEE";
    status: string;
    ruleId: string | null;
    ruleTitle: string;
    quantity: number;
    amountCents: number;
  }[],
  limit = 5,
): { ruleId: string; title: string; count: number; totalCents: number }[] {
  const groups = new Map<string, { ruleId: string; title: string; count: number; totalCents: number }>();
  for (const e of entries) {
    if (e.kind !== "PENALTY" || !e.ruleId || e.status === "PENDING_APPROVAL" || e.status === "CANCELLED") continue;
    const g = groups.get(e.ruleId) ?? { ruleId: e.ruleId, title: e.ruleTitle, count: 0, totalCents: 0 };
    g.count += e.quantity;
    g.totalCents += e.amountCents;
    groups.set(e.ruleId, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.totalCents - a.totalCents || a.title.localeCompare(b.title))
    .slice(0, limit);
}

/**
 * Gebuchter Betrag aus dem Protokolltext einer Zahlung, z. B. „20,00 € bar“ → 2000.
 * Nur für Zahlungen, die vor dem Feld AuditLog.amountCents (16.11.2026) gebucht wurden. null, wenn kein Betrag erkennbar.
 */
export function centsFromPaymentNote(note: string | null | undefined): number | null {
  const m = note?.match(/(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s*€/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "")) * 100 + Number(m[2]);
}

const berlinDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });
/** Kalendertag in Berliner Zeit als Schlüssel „JJJJ-MM-TT“. */
export const dayKey = (d: Date) => berlinDay.format(d);

/**
 * Kassenverlauf: Kassenstand nach jedem Tag mit Bewegung (eingegangene Zahlungen, sonstige Einnahmen, Ausgaben).
 * Der letzte Punkt ist immer der aktuelle Kassenstand aus der Teamkasse (`endBalanceCents`).
 * Was sich keinem Datum zuordnen lässt (z. B. sehr alte Zahlungen ohne Betrag im Protokoll), steckt im Startwert,
 * damit Verlauf und Teamkasse nie auseinanderlaufen.
 */
export function cashHistory(
  movements: { at: Date; cents: number }[],
  endBalanceCents: number,
): { startCents: number; points: { day: string; at: Date; deltaCents: number; balanceCents: number }[] } {
  const byDay = new Map<string, { at: Date; deltaCents: number }>();
  for (const m of [...movements].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const key = dayKey(m.at);
    const d = byDay.get(key) ?? { at: m.at, deltaCents: 0 };
    d.deltaCents += m.cents;
    byDay.set(key, d);
  }
  const total = movements.reduce((s, m) => s + m.cents, 0);
  const startCents = endBalanceCents - total;
  let running = startCents;
  const points = [...byDay.entries()].map(([day, d]) => {
    running += d.deltaCents;
    return { day, at: d.at, deltaCents: d.deltaCents, balanceCents: running };
  });
  return { startCents, points };
}
