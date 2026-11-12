/**
 * Reine Fachlogik der Teamkasse (ohne Datenbank), damit sie per Unit-Test prüfbar ist.
 * Wird von der PenaltyEngine (src/services/penaltyEngine.ts) verwendet.
 */

export type PenaltyStatus = "PENDING_APPROVAL" | "OPEN" | "PARTIAL" | "PAID_CASH" | "PAID_PAYPAL" | "CANCELLED";

export type AttendanceStatus = "ATTENDING" | "EXCUSED" | "UNSURE" | "INJURED" | "UNEXCUSED";

export type EventType = "TRAINING" | "GAME" | "TOURNAMENT" | "PARTY" | "OTHER";

export interface RuleLike {
  id: string;
  position: number | null;
  amountCents: number;
  trigger: "UNEXCUSED_ABSENCE" | "UNEXCUSED_GAME" | "LATE" | "LATE_FEE" | "MANUAL";
  active: boolean;
}

export interface EntryLike {
  amountCents: number;
  paidCents: number;
  status: PenaltyStatus;
}

/** Tage bis zur Fälligkeit einer freigegebenen Strafe. */
export const DUE_DAYS = 7;

/** Spieler dürfen selbst nur diese Status wählen; UNEXCUSED setzt ausschließlich der Trainer. */
export const PLAYER_CHOICES: AttendanceStatus[] = ["ATTENDING", "EXCUSED", "UNSURE", "INJURED"];

/** Welche Katalogregel bei unentschuldigtem Fehlen greift: Training Pos. 8, Spiel und Turnier Pos. 9 (#47). */
export function absenceTriggerFor(type: EventType): RuleLike["trigger"] | null {
  if (type === "TRAINING") return "UNEXCUSED_ABSENCE";
  if (type === "GAME" || type === "TOURNAMENT") return "UNEXCUSED_GAME";
  return null;
}

/**
 * REQ-PEN-02: Liefert die Katalogregel, die für einen Anwesenheitsstatus vorgeschlagen wird.
 * Nur UNEXCUSED erzeugt einen Vorschlag, und nur bei Training (Pos. 8), Spiel und Turnier (Pos. 9).
 * Bei Feiern und sonstigen Terminen gibt es keine automatische Strafe.
 */
export function suggestRuleForAttendance(
  status: AttendanceStatus,
  rules: RuleLike[],
  eventType: EventType = "TRAINING",
): RuleLike | null {
  if (status !== "UNEXCUSED") return null;
  const trigger = absenceTriggerFor(eventType);
  if (!trigger) return null;
  return rules.find((r) => r.active && r.trigger === trigger) ?? null;
}

/** #46: Betrag einer manuell vergebenen Strafe (z. B. 2 € je vergessenem Gegenstand × Anzahl). */
export function manualPenaltyAmount(rule: { amountCents: number; active: boolean }, quantity: number): number {
  if (!rule.active) throw new Error("Diese Katalogposition ist nicht aktiv.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20)
    throw new Error("Bitte eine Anzahl von 1 bis 20 angeben.");
  if (rule.amountCents <= 0) throw new Error("Diese Katalogposition hat keinen Geldbetrag.");
  return rule.amountCents * quantity;
}

/** Status, in denen noch Geld offen ist und die im Saldo zählen. */
export function isOutstanding(status: PenaltyStatus): boolean {
  return status === "OPEN" || status === "PARTIAL";
}

/** Offener Betrag einer einzelnen Strafe in Cent. */
export function openAmount(entry: EntryLike): number {
  return isOutstanding(entry.status) ? entry.amountCents - entry.paidCents : 0;
}

/** REQ-PEN-03: Saldo eines Spielers = Summe aller offenen Beträge in Cent. */
export function balance(entries: EntryLike[]): number {
  return entries.reduce((sum, e) => sum + openAmount(e), 0);
}

/** Fälligkeitsdatum ab Freigabe (Frist 7 Tage). */
export function dueDateFrom(approvedAt: Date): Date {
  const d = new Date(approvedAt);
  d.setDate(d.getDate() + DUE_DAYS);
  return d;
}

/** Zahlungsweg beim Kassenwart (TSVK-Katalog: bar oder PayPal). */
export type PaymentMethod = "CASH" | "PAYPAL";

/** Mahngebühr laut TSVK-Katalog je angefangener Woche Verzug (Standard, falls das Team keine eigene Regel hat). */
export const LATE_FEE_CENTS_PER_WEEK = 500;

/**
 * REQ-PEN-04 (MVP-5): neuer Zustand einer Strafe nach einer Zahlung.
 * - ohne Betrag bzw. Betrag >= offener Rest: vollständig bezahlt (PAID_CASH oder PAID_PAYPAL)
 * - kleinerer Betrag: Teilzahlung (PARTIAL), z. B. bei Staffelung nach Absprache
 * Wirft einen Fehler, wenn die Strafe nicht offen ist oder der Betrag nicht passt.
 */
export function applyPayment(
  entry: EntryLike,
  method: PaymentMethod,
  amountCents?: number,
): { status: PenaltyStatus; paidCents: number; bookedCents: number } {
  if (!isOutstanding(entry.status)) throw new Error("Diese Strafe ist nicht offen.");
  const rest = entry.amountCents - entry.paidCents;
  const booked = amountCents ?? rest;
  if (!Number.isInteger(booked) || booked <= 0) throw new Error("Bitte einen Betrag größer als 0 eingeben.");
  if (booked > rest) throw new Error("Der Betrag ist höher als der offene Rest.");
  const paidCents = entry.paidCents + booked;
  if (paidCents < entry.amountCents) return { status: "PARTIAL", paidCents, bookedCents: booked };
  return { status: method === "CASH" ? "PAID_CASH" : "PAID_PAYPAL", paidCents, bookedCents: booked };
}

/** Überfällig = noch Geld offen und die Zahlungsfrist (7 Tage ab Freigabe) ist abgelaufen. */
export function isOverdue(entry: EntryLike & { dueDate: Date | null }, now: Date = new Date()): boolean {
  return isOutstanding(entry.status) && entry.dueDate !== null && entry.dueDate < now;
}

/** Angefangene Wochen seit Ablauf der Frist (0, wenn nicht überfällig). Grundlage der Mahngebühr. */
export function weeksOverdue(entry: EntryLike & { dueDate: Date | null }, now: Date = new Date()): number {
  if (!isOverdue(entry, now)) return 0;
  const days = (now.getTime() - entry.dueDate!.getTime()) / (24 * 60 * 60 * 1000);
  return Math.ceil(days / 7);
}

/**
 * #52: Für welche Verzugswochen fehlt noch eine Mahngebühr? Je angefangener Woche nach der Frist genau eine.
 * `existingWeeks` enthält auch erlassene (stornierte) Gebühren, damit eine erlassene Gebühr nicht wiederkommt.
 */
export function missingLateFeeWeeks(
  entry: EntryLike & { dueDate: Date | null },
  existingWeeks: number[],
  now: Date = new Date(),
): number[] {
  const weeks = weeksOverdue(entry, now);
  const have = new Set(existingWeeks);
  const missing: number[] = [];
  for (let w = 1; w <= weeks; w++) if (!have.has(w)) missing.push(w);
  return missing;
}

/** #53: Kassenstand = eingenommene Strafen/Beiträge + sonstige Einnahmen − Ausgaben (stornierte Buchungen zählen nicht). */
export function cashBalance(
  paidCents: number,
  transactions: { direction: "INCOME" | "EXPENSE"; amountCents: number; cancelledAt: Date | null }[],
): { incomeCents: number; expenseCents: number; balanceCents: number } {
  const active = transactions.filter((t) => !t.cancelledAt);
  const incomeCents = active.filter((t) => t.direction === "INCOME").reduce((s, t) => s + t.amountCents, 0);
  const expenseCents = active.filter((t) => t.direction === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);
  return { incomeCents, expenseCents, balanceCents: paidCents + incomeCents - expenseCents };
}

/**
 * #54: PayPal.me-Eingabe des Kassenwarts vereinheitlichen. Erlaubt „name“, „@name“, „paypal.me/name“ oder den ganzen Link.
 * Liefert den reinen Namen oder null bei ungültiger Eingabe.
 */
export function normalizePaypalMe(input: string): string | null {
  const v = input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?paypal\.me\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  return /^[A-Za-z0-9]{1,20}$/.test(v) ? v : null;
}

/** #54: Link, der PayPal direkt mit dem offenen Betrag öffnet, z. B. https://paypal.me/name/20.00EUR */
export function paypalMeUrl(name: string, cents: number): string {
  return `https://paypal.me/${encodeURIComponent(name)}/${(cents / 100).toFixed(2)}EUR`;
}

/**
 * #30: Beteiligungsquote eines Spielers über vergangene Termine.
 * - roh: anwesend / alle Termine
 * - bereinigt: Termine mit Status „Verletzt“ zählen nicht mit (verletzte Spieler werden nicht schlechter gestellt)
 * Ohne Termine im Nenner ist die Quote null (keine Aussage möglich).
 */
export function participationRate(statuses: (AttendanceStatus | null)[]): {
  attended: number;
  injured: number;
  total: number;
  rate: number | null;
  adjustedRate: number | null;
} {
  const total = statuses.length;
  const attended = statuses.filter((s) => s === "ATTENDING").length;
  const injured = statuses.filter((s) => s === "INJURED").length;
  const adjustedTotal = total - injured;
  return {
    attended,
    injured,
    total,
    rate: total > 0 ? attended / total : null,
    adjustedRate: adjustedTotal > 0 ? attended / adjustedTotal : null,
  };
}
