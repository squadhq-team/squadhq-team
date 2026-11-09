import { requireRole } from "@/lib/auth";
import { PENALTY_LABEL, formatDateTime, formatEuro } from "@/lib/format";
import { getTeamCash } from "@/services/paymentService";
import { Badge, Card, ErrorNotice, inputClass, penaltyTone } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { payAction } from "../actions";

/**
 * Kassenwart-Ansicht: Teamkasse mit allen offenen und bezahlten Strafen (REQ-PEN-03 / MVP-4)
 * und Zahlungen verbuchen per Klick, bar oder PayPal (REQ-PEN-04 / MVP-5).
 * Der Trainer sieht die Kasse auch, verbuchen darf nur der Kassenwart.
 */
export default async function CashPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const user = await requireRole("CASHIER", "TRAINER");
  const canBook = user.role === "CASHIER";
  const { fehler } = await searchParams;
  const cash = await getTeamCash();

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Teamkasse</h1>
        <p className="text-sm text-gray-600">
          {canBook ? "Zahlungen mit einem Klick verbuchen." : "Nur ansehen. Zahlungen verbucht der Kassenwart."} Frist: 7 Tage ab Freigabe.
        </p>
      </div>
      <ErrorNotice message={fehler} />

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Offen" value={formatEuro(cash.openCents)} tone="text-red-700" />
        <Stat label="Eingenommen" value={formatEuro(cash.paidCents)} tone="text-emerald-700" />
        <Stat label="Überfällig" value={String(cash.overdueCount)} tone={cash.overdueCount > 0 ? "text-red-700" : "text-gray-900"} />
      </div>

      <Card title="Offene Strafen">
        {cash.open.length === 0 && <p className="text-sm text-gray-500">Keine offenen Strafen.</p>}
        <ul className="divide-y">
          {cash.open.map((p) => {
            const overdue = p.overdue;
            const weeks = p.weeksOverdue;
            return (
              <li key={p.id} className={`py-3 ${overdue ? "-mx-2 rounded-lg bg-red-50 px-2" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.player.name}</p>
                    <p className="text-sm text-gray-600">
                      {p.rule.position ? `Pos. ${p.rule.position}: ` : ""}
                      {p.rule.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.session ? `Training ${formatDateTime(p.session.startsAt)}` : "ohne Training"}
                      {p.dueDate && ` · fällig ${formatDateTime(p.dueDate)}`}
                    </p>
                    {overdue && (
                      <p className="mt-1 text-xs font-medium text-red-800">
                        Überfällig seit {weeks} {weeks === 1 ? "Woche" : "Wochen"} · Mahngebühr laut Katalog {formatEuro(p.lateFeeCents)} (noch nicht gebucht)
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatEuro(p.openCents)}</p>
                    {p.status === "PARTIAL" && <p className="text-xs text-gray-500">von {formatEuro(p.amountCents)}</p>}
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={penaltyTone(p.status)}>{PENALTY_LABEL[p.status]}</Badge>
                      {overdue && <Badge tone="red">Überfällig</Badge>}
                    </div>
                  </div>
                </div>
                {canBook && (
                  <>
                    <ActionForm action={payAction} className="mt-2 grid grid-cols-2 gap-2 text-sm font-medium text-white">
                      <input type="hidden" name="entryId" value={p.id} />
                      <SubmitButton name="method" value="CASH" className="rounded-lg bg-emerald-700 px-2 py-2 hover:bg-emerald-800">
                        Bezahlt (bar)
                      </SubmitButton>
                      <SubmitButton name="method" value="PAYPAL" className="rounded-lg bg-sky-700 px-2 py-2 hover:bg-sky-800">
                        Bezahlt (PayPal)
                      </SubmitButton>
                    </ActionForm>
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-emerald-800">Teilzahlung verbuchen</summary>
                      <ActionForm action={payAction} className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="entryId" value={p.id} />
                        <input name="amount" inputMode="decimal" placeholder="Betrag in €, z. B. 10" required className={`${inputClass} max-w-40`} />
                        <SubmitButton name="method" value="CASH" className="rounded-lg bg-gray-200 px-3 py-2 hover:bg-gray-300">
                          bar
                        </SubmitButton>
                        <SubmitButton name="method" value="PAYPAL" className="rounded-lg bg-gray-200 px-3 py-2 hover:bg-gray-300">
                          PayPal
                        </SubmitButton>
                      </ActionForm>
                    </details>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {cash.balances.length > 0 && (
        <Card title="Offene Beträge je Spieler">
          <ul className="divide-y text-sm">
            {cash.balances.map((b) => (
              <li key={b.name} className="flex justify-between py-2">
                <span>{b.name}</span>
                <span className="font-semibold text-red-700">{formatEuro(b.saldoCents)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Bezahlte Strafen">
        {cash.paid.length === 0 && <p className="text-sm text-gray-500">Noch nichts bezahlt.</p>}
        <ul className="divide-y text-sm">
          {cash.paid.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <p className="font-medium">{p.player.name}</p>
                <p className="text-xs text-gray-500">
                  {p.rule.title} · verbucht {formatDateTime(p.updatedAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatEuro(p.amountCents)}</p>
                <Badge tone={penaltyTone(p.status)}>{PENALTY_LABEL[p.status]}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}
