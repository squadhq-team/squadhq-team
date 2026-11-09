/**
 * Reine Fachlogik der Teamkasse (ohne Datenbank), damit sie per Unit-Test prüfbar ist.
 * Wird von der PenaltyEngine (src/services/penaltyEngine.ts) verwendet.
 */

export type PenaltyStatus = "PENDING_APPROVAL" | "OPEN" | "PARTIAL" | "PAID_CASH" | "PAID_PAYPAL" | "CANCELLED";

export type AttendanceStatus = "ATTENDING" | "EXCUSED" | "UNSURE" | "UNEXCUSED";

export interface RuleLike {
  id: string;
  position: number | null;
  amountCents: number;
  trigger: "UNEXCUSED_ABSENCE" | "LATE" | "MANUAL";
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
export const PLAYER_CHOICES: AttendanceStatus[] = ["ATTENDING", "EXCUSED", "UNSURE"];

/**
 * REQ-PEN-02: Liefert die Katalogregel, die für einen Anwesenheitsstatus vorgeschlagen wird.
 * Nur UNEXCUSED erzeugt einen Vorschlag; alle anderen Status liefern null.
 */
export function suggestRuleForAttendance(status: AttendanceStatus, rules: RuleLike[]): RuleLike | null {
  if (status !== "UNEXCUSED") return null;
  return rules.find((r) => r.active && r.trigger === "UNEXCUSED_ABSENCE") ?? null;
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

/** Mahngebühr laut TSVK-Katalog je angefangener Woche Verzug. Wird in P4 nur angezeigt, noch nicht gebucht. */
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
