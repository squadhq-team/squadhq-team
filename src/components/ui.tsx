/** Kleine, wiederverwendbare UI-Bausteine (mobile-first). */
import type { ReactNode } from "react";

export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-gray-100 text-gray-700",
  blue: "bg-sky-100 text-sky-800",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function attendanceTone(status: string | null | undefined): Tone {
  if (status === "ATTENDING") return "green";
  if (status === "EXCUSED") return "blue";
  if (status === "UNEXCUSED") return "red";
  if (status === "UNSURE") return "amber";
  return "gray";
}

export function penaltyTone(status: string): Tone {
  if (status === "PENDING_APPROVAL") return "amber";
  if (status === "OPEN" || status === "PARTIAL") return "red";
  if (status === "CANCELLED") return "gray";
  return "green";
}
