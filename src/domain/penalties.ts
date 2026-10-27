/**
 * Reine Fachlogik der Teamkasse (ohne Datenbank), damit sie per Unit-Test prüfbar ist.
 * Wird von der PenaltyEngine (src/services/penaltyEngine.ts) verwendet.
 */

export type PenaltyStatus =
  | "PENDING_APPROVAL"
  | "OPEN"
  | "PARTIAL"
  | "PAID_CASH"
  | "PAID_PAYPAL"
  | "CANCELLED";

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

/** Fälligkeitsdatum ab Freigabe. */
export function dueDateFrom(approvedAt: Date): Date {
  const d = new Date(approvedAt);
  d.setDate(d.getDate() + DUE_DAYS);
  return d;
}
