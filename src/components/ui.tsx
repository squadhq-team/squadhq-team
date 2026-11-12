/** Wiederverwendbare UI-Bausteine (#45 einheitliches, modernes Design, mobile-first). Farben über die Tokens in globals.css. */
import type { ReactNode } from "react";
import Link from "next/link";

export function Card({
  title,
  children,
  action,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="display text-lg">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Seitenkopf: Titel, optional Untertitel, Zurück-Link und Aktion rechts. */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      {back && (
        <Link href={back.href} className="inline-block py-1 text-sm font-medium text-brand-700 hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-stone-600">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

const TONES = {
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-stone-100 text-stone-700",
  blue: "bg-sky-100 text-sky-800",
  violet: "bg-violet-100 text-violet-800",
  brand: "bg-brand-100 text-brand-800",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function attendanceTone(status: string | null | undefined): Tone {
  if (status === "ATTENDING") return "green";
  if (status === "EXCUSED") return "blue";
  if (status === "UNEXCUSED") return "red";
  if (status === "UNSURE") return "amber";
  if (status === "INJURED") return "violet";
  return "gray";
}

export function penaltyTone(status: string): Tone {
  if (status === "PENDING_APPROVAL") return "amber";
  if (status === "OPEN" || status === "PARTIAL") return "red";
  if (status === "CANCELLED") return "gray";
  return "green";
}

export function eventTone(type: string): Tone {
  if (type === "GAME") return "brand";
  if (type === "TOURNAMENT") return "violet";
  if (type === "PARTY") return "amber";
  if (type === "OTHER") return "gray";
  return "green";
}

/** Hinweis bei Fehlern aus einem Formular (kommt als ?fehler=… in der Adresse). */
export function ErrorNotice({ message }: { message?: string | string[] }) {
  const text = Array.isArray(message) ? message[0] : message;
  if (!text) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
      {text}
    </p>
  );
}

/** Erfolgs- oder Hinweismeldung (kommt als ?info=… in der Adresse). */
export function InfoNotice({ message }: { message?: string | string[] }) {
  const text = Array.isArray(message) ? message[0] : message;
  if (!text) return null;
  return (
    <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
      {text}
    </p>
  );
}

/** Hinweis bei Mails der App (Bestätigung, Passwort vergessen): Sie landen manchmal im Spam-Ordner. */
export function SpamHint() {
  return (
    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <strong>Keine Mail bekommen?</strong> Schau bitte auch im <strong>Spam- oder Werbung-Ordner</strong> nach. Die
      Mail kommt von „SquadHQ“ und kann ein paar Minuten dauern. Markiere sie am besten als „Kein Spam“, dann kommen
      auch die Erinnerungen sicher an.
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-stone-500">{children}</p>;
}

/** Formularfeld mit Beschriftung und optionalem Hinweis. */
export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

/** Kennzahl in einer kleinen Kachel. */
export function Stat({ label, value, tone = "text-stone-900" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

/** Kreis mit Initialen als Profilbild. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const cls = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-sm";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800 ${cls}`}
    >
      {initials || "?"}
    </span>
  );
}

/** Reiter (z. B. in der Kasse); aktiver Reiter hervorgehoben. */
export function Tabs({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
            t.key === active ? "bg-ink text-white" : "bg-white text-stone-700 ring-1 ring-black/10 hover:bg-stone-50"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base sm:text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200";

/** Button-Stile; immer mit SubmitButton oder Link kombinieren. */
export const btn = {
  primary: "rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800",
  brand: "rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800",
  secondary:
    "rounded-xl bg-white px-4 py-3 text-sm font-semibold text-stone-900 ring-1 ring-stone-300 hover:bg-stone-50",
  ghost: "rounded-xl px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50",
  danger: "rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-300 hover:bg-red-50",
  small: "rounded-lg px-3 py-1.5 text-sm font-medium",
};

/** Link, der wie ein Button aussieht. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof btn;
  className?: string;
}) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-1.5 ${btn[variant]} ${className}`}>
      {children}
    </Link>
  );
}
