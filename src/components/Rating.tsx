/** Anzeige der Leistungsbewertung (#65): Sterne, Schnitt und Trend. */
import type { Trend } from "@/domain/statistics";
import { Badge } from "./ui";

/**
 * Sterne (★) mit lesbarer Beschriftung für Screenreader. Bruchteile (Schnitt, z. B. 3,5) werden anteilig gefüllt:
 * goldene Sterne liegen über grauen und werden auf den Anteil value/5 abgeschnitten.
 */
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const label = value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  return (
    <span
      role="img"
      aria-label={`${label} von 5 Sternen`}
      className={`relative inline-block whitespace-nowrap leading-none tracking-tight ${className}`}
    >
      <span aria-hidden className="text-stone-300">
        ★★★★★
      </span>
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 overflow-hidden text-amber-500"
        style={{ width: `${(Math.min(5, Math.max(0, value)) / 5) * 100}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}

/** Schnitt mit einer Nachkommastelle, z. B. „3,7“. */
export const formatAverage = (v: number | null) =>
  v === null ? "–" : v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const TREND = {
  UP: { label: "↗ steigend", tone: "green" },
  DOWN: { label: "↘ fallend", tone: "red" },
  FLAT: { label: "→ gleichbleibend", tone: "gray" },
} as const;

/** Trend der letzten Bewertungen; ohne genug Bewertungen (null) nichts. */
export function TrendBadge({ trend }: { trend: Trend | null }) {
  if (!trend) return null;
  return <Badge tone={TREND[trend].tone}>{TREND[trend].label}</Badge>;
}
