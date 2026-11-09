const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const dateTime = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

export const formatEuro = (cents: number) => euro.format(cents / 100);
export const formatDateTime = (d: Date) => dateTime.format(d);

export const ATTENDANCE_LABEL = {
  ATTENDING: "Dabei",
  EXCUSED: "Entschuldigt",
  UNSURE: "Noch unsicher",
  UNEXCUSED: "Unentschuldigt",
} as const;

export const PENALTY_LABEL = {
  PENDING_APPROVAL: "Wartet auf Freigabe",
  OPEN: "Offen",
  PARTIAL: "Teilweise bezahlt",
  PAID_CASH: "Bezahlt (bar)",
  PAID_PAYPAL: "Bezahlt (PayPal)",
  CANCELLED: "Storniert",
} as const;

export const ROLE_LABEL = { TRAINER: "Trainer", CASHIER: "Kassenwart", PLAYER: "Spieler" } as const;

const berlinParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Berlin",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Abstand der deutschen Uhrzeit zu UTC in Minuten zu einem Zeitpunkt (60 im Winter, 120 im Sommer). */
function berlinOffsetMinutes(at: Date): number {
  const p = Object.fromEntries(berlinParts.formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/**
 * Wert aus einem Formularfeld <input type="datetime-local"> (z. B. "2026-11-12T19:00") als deutsche Uhrzeit lesen.
 * Nötig, weil der Server (Vercel) in UTC läuft, der Trainer die Uhrzeit aber in deutscher Zeit eingibt.
 */
export function parseBerlinDateTime(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return new Date(NaN);
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const guess = new Date(asUtc - berlinOffsetMinutes(new Date(asUtc)) * 60000);
  return new Date(asUtc - berlinOffsetMinutes(guess) * 60000);
}

/** Euro-Eingabe wie "12,50" oder "12.5" in Cent umrechnen; NaN bei ungültiger Eingabe. */
export function parseEuroToCents(value: string): number {
  const v = value.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return NaN;
  return Math.round(parseFloat(v) * 100);
}
