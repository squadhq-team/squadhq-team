/** Anzeige-Hilfen: Euro- und Datumsformat (Berliner Zeit), deutsche Texte für Enum-Werte, Eingaben aus Formularen umwandeln. */
const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const dateTime = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

const dateOnly = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "Europe/Berlin",
});
const timeOnly = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const weekdayTime = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});
const dayShort = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });

export const formatEuro = (cents: number) => euro.format(cents / 100);
export const formatDateTime = (d: Date) => dateTime.format(d);
/** z. B. „Samstag, 14. November“ */
export const formatDate = (d: Date) => dateOnly.format(d);
/** z. B. „19:00“ */
export const formatTime = (d: Date) => timeOnly.format(d);
/** z. B. „Sa., 16:00“ (Rückmeldefrist liegt oft an einem anderen Tag als der Termin) */
export const formatWeekdayTime = (d: Date) => weekdayTime.format(d);
/** z. B. „14.11.“ */
export const formatDayShort = (d: Date) => dayShort.format(d);

export const ATTENDANCE_LABEL = {
  ATTENDING: "Dabei",
  EXCUSED: "Entschuldigt",
  UNSURE: "Noch unsicher",
  INJURED: "Verletzt",
  UNEXCUSED: "Unentschuldigt",
} as const;

export const EVENT_TYPE_LABEL = {
  TRAINING: "Training",
  GAME: "Spiel",
  TOURNAMENT: "Turnier",
  PARTY: "Mannschaftsfeier",
  OTHER: "Sonstiges",
} as const;

export const PENALTY_LABEL = {
  PENDING_APPROVAL: "Wartet auf Freigabe",
  OPEN: "Offen",
  PARTIAL: "Teilweise bezahlt",
  PAID_CASH: "Bezahlt (bar)",
  PAID_PAYPAL: "Bezahlt (PayPal)",
  CANCELLED: "Storniert",
} as const;

export const ROLE_LABEL = {
  TRAINER: "Trainer",
  ASSISTANT: "Betreuer",
  CASHIER: "Kassenwart",
  PLAYER: "Spieler",
  GUARDIAN: "Elternteil/Stellvertreter",
} as const;

export const ROLE_HINT = {
  TRAINER: "Termine, Anwesenheit, Strafen freigeben, Mitglieder und Rollen verwalten",
  ASSISTANT: "Termine und Anwesenheit, Strafen vorschlagen, Neuigkeiten",
  CASHIER: "Teamkasse, Zahlungen, Beiträge, Kassenbuch; spielt selbst mit",
  PLAYER: "Zu- und absagen, eigenes Kassenkonto",
  GUARDIAN: "Sagt für verknüpfte Mitglieder (z. B. Kinder) zu und ab",
} as const;

/** Anzeigename einer Forderung: eigener Titel (Beitrag, Mahngebühr) oder Katalogregel, ggf. mit Anzahl. */
export function entryTitle(e: {
  title: string | null;
  quantity: number;
  rule: { title: string; position: number | null } | null;
}) {
  const base =
    e.title ?? (e.rule ? `${e.rule.position ? `Pos. ${e.rule.position}: ` : ""}${e.rule.title}` : "Forderung");
  return e.quantity > 1 ? `${base} × ${e.quantity}` : base;
}

/** Datum für <input type="datetime-local"> in deutscher Zeit, z. B. "2026-11-14T15:00" (Gegenstück zu parseBerlinDateTime). */
export function toBerlinInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const p = Object.fromEntries(berlinParts.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

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
