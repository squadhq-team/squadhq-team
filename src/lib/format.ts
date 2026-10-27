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
