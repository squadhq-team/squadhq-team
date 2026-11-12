/** Kassenkonto eines Mitglieds (REQ-PEN-03): Saldo, PayPal-Button (#54) und alle Forderungen. */
import { PENALTY_LABEL, entryTitle, formatDateTime, formatEuro } from "@/lib/format";
import { Badge, Card, EmptyState, penaltyTone } from "./ui";

type Entry = {
  id: string;
  kind: "PENALTY" | "LATE_FEE" | "FEE";
  title: string | null;
  quantity: number;
  status: keyof typeof PENALTY_LABEL;
  amountCents: number;
  paidCents: number;
  dueDate: Date | null;
  note: string | null;
  rule: { title: string; position: number | null } | null;
  session: { startsAt: Date; title: string } | null;
};

export function AccountView({
  title,
  saldoCents,
  entries,
  paypalUrl,
}: {
  title: string;
  saldoCents: number;
  entries: Entry[];
  /** Link „Per PayPal zahlen“ mit offenem Betrag, wenn der Kassenwart einen PayPal.me-Namen hinterlegt hat */
  paypalUrl: string | null;
}) {
  const now = new Date();
  return (
    <>
      <section className="rounded-2xl bg-ink p-5 text-white shadow-sm">
        <p className="text-sm text-white/70">{title}</p>
        <p className={`display text-5xl ${saldoCents > 0 ? "text-white" : "text-accent"}`}>{formatEuro(saldoCents)}</p>
        <p className="mt-1 text-sm text-white/70">
          {saldoCents > 0 ? "offen · bar beim Kassenwart oder per PayPal" : "Alles bezahlt. Danke!"}
        </p>
        {saldoCents > 0 && paypalUrl && (
          <a
            href={paypalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-ink hover:brightness-95"
          >
            Per PayPal zahlen ({formatEuro(saldoCents)})
          </a>
        )}
        {saldoCents > 0 && paypalUrl && (
          <p className="mt-2 text-xs text-white/60">
            Als bezahlt markiert der Kassenwart, sobald das Geld angekommen ist.
          </p>
        )}
      </section>
      <Card title="Verlauf">
        {entries.length === 0 ? (
          <EmptyState>Keine Strafen oder Beiträge.</EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {entries.map((p) => {
              const overdue = (p.status === "OPEN" || p.status === "PARTIAL") && p.dueDate !== null && p.dueDate < now;
              return (
                <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{entryTitle(p)}</p>
                    <p className="text-xs text-stone-500">
                      {p.kind === "FEE"
                        ? "Beitrag"
                        : p.session
                          ? `${p.session.title} am ${formatDateTime(p.session.startsAt)}`
                          : "ohne Termin"}
                      {p.dueDate && ` · fällig ${formatDateTime(p.dueDate)}`}
                    </p>
                    {p.note && <p className="text-xs text-stone-500">Notiz: {p.note}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{formatEuro(p.amountCents)}</p>
                    {p.status === "PARTIAL" && (
                      <p className="text-xs text-stone-500">{formatEuro(p.paidCents)} bezahlt</p>
                    )}
                    <div className="mt-0.5 flex flex-col items-end gap-1">
                      <Badge tone={penaltyTone(p.status)}>{PENALTY_LABEL[p.status]}</Badge>
                      {overdue && <Badge tone="red">Überfällig</Badge>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
