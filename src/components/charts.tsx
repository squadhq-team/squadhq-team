/**
 * Schlanke Diagramme für die Statistik (#65) als SVG, ohne zusätzliche Bibliothek, serverseitig gerendert.
 * Eine Datenreihe in der Markenfarbe, ruhige Achsen, Werte beim Antippen/Überfahren (title) und
 * zusätzlich als Tabelle (Barrierefreiheit: Information nie nur über die Grafik).
 */
import type { ReactNode } from "react";

const W = 320;
const H = 168;
const PAD = { top: 12, right: 12, bottom: 22, left: 44 };

export interface ChartPoint {
  /** Beschriftung an der x-Achse (nur erster und letzter Punkt werden angezeigt) */
  label: string;
  value: number;
  /** Text beim Antippen/Überfahren des Punkts */
  title: string;
}

/**
 * Liniendiagramm mit einer Reihe. `step`: Treppenlinie (Wert gilt bis zur nächsten Änderung, z. B. Kassenstand).
 * `domain`: feste y-Achse (z. B. 1–5 Sterne), sonst aus den Werten inklusive 0.
 */
export function LineChart({
  points,
  formatY,
  domain,
  step = false,
  ariaLabel,
}: {
  points: ChartPoint[];
  formatY: (v: number) => string;
  domain?: [number, number];
  step?: boolean;
  ariaLabel: string;
}) {
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const [min, max] = domain ?? [Math.min(0, ...values), Math.max(0, ...values)];
  const span = max - min || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - min) / span) * innerH;
  const ticks = domain ? range(domain[0], domain[1]) : [min, ...(min < 0 && max > 0 ? [0] : []), max];

  let d = "";
  points.forEach((p, i) => {
    if (i === 0) d += `M${x(i)},${y(p.value)}`;
    else if (step) d += `H${x(i)}V${y(p.value)}`;
    else d += `L${x(i)},${y(p.value)}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
      {[...new Set(ticks)].map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            className={t === 0 && !domain ? "stroke-stone-400" : "stroke-stone-200"}
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={y(t)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-stone-500 text-[10px]"
          >
            {formatY(t)}
          </text>
        </g>
      ))}
      <path d={d} fill="none" className="stroke-brand-600" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={4} className="fill-brand-600 stroke-white" strokeWidth={2} />
          {/* größere, unsichtbare Fläche zum Antippen */}
          <circle cx={x(i)} cy={y(p.value)} r={12} fill="transparent">
            <title>{p.title}</title>
          </circle>
        </g>
      ))}
      <text
        x={x(0)}
        y={H - 6}
        textAnchor={points.length === 1 ? "middle" : "start"}
        className="fill-stone-500 text-[10px]"
      >
        {points[0].label}
      </text>
      {points.length > 1 && (
        <text x={x(points.length - 1)} y={H - 6} textAnchor="end" className="fill-stone-500 text-[10px]">
          {points[points.length - 1].label}
        </text>
      )}
    </svg>
  );
}

function range(from: number, to: number) {
  const out: number[] = [];
  for (let v = from; v <= to; v++) out.push(v);
  return out;
}

/** Waagerechte Balken für eine Rangliste (z. B. Top-Strafen); Länge relativ zum größten Wert. */
export function BarList({ items }: { items: { key: string; label: ReactNode; value: number; detail: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{item.label}</span>
            <span className="shrink-0 text-stone-600">{item.detail}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Aufklappbare Tabelle mit den Werten eines Diagramms. */
export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-medium text-brand-700">Werte als Tabelle</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-xs text-stone-500">
            {head.map((h, i) => (
              <th key={h} className={`py-1 font-medium ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`py-1 ${j > 0 ? "text-right tabular-nums" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
