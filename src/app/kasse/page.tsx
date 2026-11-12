import Link from "next/link";
import { can, requireMember } from "@/lib/auth";
import { PENALTY_LABEL, entryTitle, formatDateTime, formatEuro } from "@/lib/format";
import { getTeamCash, paypalLinkFor } from "@/services/paymentService";
import { getPlayerAccount, listPendingForTeam } from "@/services/penaltyEngine";
import { listRespondents } from "@/services/teamService";
import { AccountView } from "@/components/AccountView";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Stat,
  Tabs,
  btn,
  inputClass,
  penaltyTone,
} from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { approveAction, discardAction } from "../termine/actions";
import { cancelPenaltyAction, cancelTransactionAction, payAction, setPaypalAction } from "./actions";

type View = "konto" | "offen" | "freigabe" | "kassenbuch" | "bezahlt" | "einstellungen";

/**
 * Teamkasse (REQ-PEN-03/04, MVP-4/5): Spieler sehen ihr Kassenkonto, Stellvertreter das ihrer Mitglieder.
 * Trainer und Kassenwart sehen die ganze Kasse; nur der Kassenwart verbucht. Mahngebühren entstehen automatisch (#52),
 * Einnahmen/Ausgaben im Kassenbuch (#53), PayPal-Link (#54).
 */
export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<{ ansicht?: string; mitglied?: string }>;
}) {
  const user = await requireMember();
  const sp = await searchParams;
  const seeAll = can(user, "kasse.ansehen");
  const book = can(user, "kasse.buchen");
  const approve = can(user, "strafen.freigeben");
  const respondents = await listRespondents(user);
  const ownAccount = respondents.length > 0;
  const pending = approve ? await listPendingForTeam(user.teamId) : [];

  const tabs: { key: View; label: string; href: string }[] = [];
  if (ownAccount)
    tabs.push({
      key: "konto",
      label: respondents.some((r) => r.id === user.id) ? "Mein Konto" : "Konto",
      href: "/kasse?ansicht=konto",
    });
  if (seeAll) {
    tabs.push({ key: "offen", label: "Offen", href: "/kasse?ansicht=offen" });
    if (approve)
      tabs.push({
        key: "freigabe",
        label: `Freigabe${pending.length ? ` (${pending.length})` : ""}`,
        href: "/kasse?ansicht=freigabe",
      });
    tabs.push({ key: "kassenbuch", label: "Kassenbuch", href: "/kasse?ansicht=kassenbuch" });
    tabs.push({ key: "bezahlt", label: "Bezahlt", href: "/kasse?ansicht=bezahlt" });
    if (book) tabs.push({ key: "einstellungen", label: "PayPal", href: "/kasse?ansicht=einstellungen" });
  }
  const requested = tabs.find((t) => t.key === sp.ansicht)?.key;
  const view: View = requested ?? (seeAll ? "offen" : "konto");

  return (
    <>
      <PageHeader
        title="Kasse"
        action={
          <Link href="/kasse/katalog" className={`${btn.small} bg-white ring-1 ring-stone-300`}>
            Strafenkatalog
          </Link>
        }
      />
      {(can(user, "strafen.vergeben") || book) && (
        <div className="grid grid-cols-2 gap-2">
          {can(user, "strafen.vergeben") && <ButtonLink href="/kasse/strafe">+ Strafe</ButtonLink>}
          {book && (
            <ButtonLink href="/kasse/buchung" variant="secondary">
              + Ein-/Ausgabe
            </ButtonLink>
          )}
          {book && (
            <ButtonLink href="/kasse/beitrag" variant="secondary">
              + Beitrag
            </ButtonLink>
          )}
          {seeAll && (
            <ButtonLink href="/protokoll" variant="secondary">
              Protokoll
            </ButtonLink>
          )}
        </div>
      )}
      {tabs.length > 1 && <Tabs items={tabs} active={view} />}
      {view === "konto" && (
        <AccountTab
          userId={user.id}
          teamId={user.teamId}
          respondents={respondents}
          selected={sp.mitglied}
          paypalMe={user.team.paypalMe}
        />
      )}
      {view !== "konto" && seeAll && (
        <TeamCash
          view={view}
          teamId={user.teamId}
          book={book}
          approve={approve}
          pending={pending}
          paypalMe={user.team.paypalMe}
        />
      )}
    </>
  );
}

async function AccountTab({
  userId,
  teamId,
  respondents,
  selected,
  paypalMe,
}: {
  userId: string;
  teamId: string;
  respondents: { id: string; name: string }[];
  selected?: string;
  paypalMe: string | null;
}) {
  const member = respondents.find((r) => r.id === selected) ?? respondents[0];
  if (!member) return <EmptyState>Du hast kein eigenes Kassenkonto.</EmptyState>;
  const account = await getPlayerAccount(teamId, member.id);
  return (
    <>
      {respondents.length > 1 && (
        <Tabs
          active={member.id}
          items={respondents.map((r) => ({
            key: r.id,
            label: r.id === userId ? "Ich" : r.name,
            href: `/kasse?ansicht=konto&mitglied=${r.id}`,
          }))}
        />
      )}
      <AccountView
        title={member.id === userId ? "Mein Kassenkonto" : `Kassenkonto ${member.name}`}
        saldoCents={account.saldoCents}
        entries={account.entries}
        paypalUrl={paypalLinkFor({ paypalMe }, account.saldoCents)}
      />
    </>
  );
}

async function TeamCash({
  view,
  teamId,
  book,
  approve,
  pending,
  paypalMe,
}: {
  view: View;
  teamId: string;
  book: boolean;
  approve: boolean;
  pending: Awaited<ReturnType<typeof listPendingForTeam>>;
  paypalMe: string | null;
}) {
  const cash = await getTeamCash(teamId);
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Kassenstand"
          value={formatEuro(cash.balanceCents)}
          tone={cash.balanceCents < 0 ? "text-red-700" : "text-brand-700"}
        />
        <Stat label="Offen" value={formatEuro(cash.openCents)} tone="text-red-700" />
        <Stat label="Eingenommen" value={formatEuro(cash.paidCents + cash.incomeCents)} />
        <Stat
          label="Überfällig"
          value={String(cash.overdueCount)}
          tone={cash.overdueCount > 0 ? "text-red-700" : "text-stone-900"}
        />
      </div>

      {view === "offen" && (
        <>
          <Card title="Offene Forderungen">
            {cash.open.length === 0 && <EmptyState>Keine offenen Strafen oder Beiträge.</EmptyState>}
            <ul className="divide-y divide-stone-100">
              {cash.open.map((p) => (
                <li key={p.id} className={`py-3 ${p.overdue ? "-mx-2 rounded-xl bg-red-50 px-2" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{p.player.name}</p>
                      <p className="text-sm text-stone-600">{entryTitle(p)}</p>
                      <p className="text-xs text-stone-500">
                        {p.kind === "LATE_FEE"
                          ? "automatisch (Zahlungsverzug)"
                          : p.session
                            ? `${p.session.title} ${formatDateTime(p.session.startsAt)}`
                            : p.kind === "FEE"
                              ? "Beitrag"
                              : "ohne Termin"}
                        {p.dueDate && ` · fällig ${formatDateTime(p.dueDate)}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatEuro(p.openCents)}</p>
                      {p.status === "PARTIAL" && (
                        <p className="text-xs text-stone-500">von {formatEuro(p.amountCents)}</p>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={penaltyTone(p.status)}>{PENALTY_LABEL[p.status]}</Badge>
                        {p.overdue && <Badge tone="red">Überfällig</Badge>}
                      </div>
                    </div>
                  </div>
                  {book && (
                    <ActionForm
                      action={payAction}
                      className="mt-2 grid grid-cols-2 gap-2 text-sm font-semibold text-white"
                    >
                      <input type="hidden" name="entryId" value={p.id} />
                      <SubmitButton
                        name="method"
                        value="CASH"
                        className="rounded-xl bg-ink px-2 py-2.5 hover:bg-stone-800"
                      >
                        Bezahlt (bar)
                      </SubmitButton>
                      <SubmitButton
                        name="method"
                        value="PAYPAL"
                        className="rounded-xl bg-sky-700 px-2 py-2.5 hover:bg-sky-800"
                      >
                        Bezahlt (PayPal)
                      </SubmitButton>
                    </ActionForm>
                  )}
                  {(book || approve) && (
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer font-medium text-brand-700">
                        Mehr: Teilzahlung, {p.kind === "LATE_FEE" ? "erlassen" : "stornieren"}
                      </summary>
                      {book && (
                        <ActionForm action={payAction} className="mt-2 flex flex-wrap items-center gap-2">
                          <input type="hidden" name="entryId" value={p.id} />
                          <input
                            name="amount"
                            inputMode="decimal"
                            placeholder="Betrag in €, z. B. 10"
                            required
                            className={`${inputClass} max-w-44 py-2`}
                          />
                          <SubmitButton
                            name="method"
                            value="CASH"
                            className={`${btn.small} bg-stone-100 hover:bg-stone-200`}
                          >
                            bar
                          </SubmitButton>
                          <SubmitButton
                            name="method"
                            value="PAYPAL"
                            className={`${btn.small} bg-stone-100 hover:bg-stone-200`}
                          >
                            PayPal
                          </SubmitButton>
                        </ActionForm>
                      )}
                      {p.status === "OPEN" && (
                        <ActionForm action={cancelPenaltyAction} className="mt-2 flex flex-wrap items-center gap-2">
                          <input type="hidden" name="entryId" value={p.id} />
                          <input
                            name="note"
                            placeholder="Grund (z. B. Absprache, Irrtum)"
                            className={`${inputClass} max-w-64 py-2`}
                          />
                          <SubmitButton className={`${btn.small} text-red-700 ring-1 ring-red-300 hover:bg-red-50`}>
                            {p.kind === "LATE_FEE" ? "Mahngebühr erlassen" : "Stornieren"}
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          {cash.balances.length > 0 && (
            <Card title="Offen je Mitglied">
              <ul className="divide-y divide-stone-100 text-sm">
                {cash.balances.map((b) => (
                  <li key={b.id} className="flex justify-between py-2">
                    <span>{b.name}</span>
                    <span className="font-semibold text-red-700">{formatEuro(b.saldoCents)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {view === "freigabe" && (
        <Card title="Strafvorschläge zur Freigabe">
          {pending.length === 0 && <EmptyState>Keine offenen Vorschläge.</EmptyState>}
          <ul className="divide-y divide-stone-100">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.player.name} · {formatEuro(p.amountCents)}
                  </p>
                  <p className="text-sm text-stone-600">{entryTitle(p)}</p>
                  <p className="text-xs text-stone-500">
                    {p.session ? `${p.session.title} ${formatDateTime(p.session.startsAt)} · ` : ""}
                    vorgeschlagen von {p.createdBy?.name ?? "System"}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ActionForm action={approveAction}>
                    <input type="hidden" name="entryId" value={p.id} />
                    <SubmitButton className={`${btn.small} bg-ink text-white`}>Freigeben</SubmitButton>
                  </ActionForm>
                  <ActionForm action={discardAction}>
                    <input type="hidden" name="entryId" value={p.id} />
                    <SubmitButton className={`${btn.small} bg-stone-100 hover:bg-stone-200`}>Verwerfen</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {view === "kassenbuch" && (
        <Card
          title="Kassenbuch"
          action={
            book ? (
              <Link href="/kasse/buchung" className="text-sm font-medium text-brand-700 hover:underline">
                + Buchung
              </Link>
            ) : undefined
          }
        >
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="font-semibold">{formatEuro(cash.paidCents)}</p>
              <p className="text-xs text-stone-500">Strafen &amp; Beiträge</p>
            </div>
            <div>
              <p className="font-semibold text-brand-700">+{formatEuro(cash.incomeCents)}</p>
              <p className="text-xs text-stone-500">Einnahmen</p>
            </div>
            <div>
              <p className="font-semibold text-red-700">−{formatEuro(cash.expenseCents)}</p>
              <p className="text-xs text-stone-500">Ausgaben</p>
            </div>
          </div>
          {cash.transactions.length === 0 && <EmptyState>Noch keine Einnahmen oder Ausgaben gebucht.</EmptyState>}
          <ul className="divide-y divide-stone-100 text-sm">
            {cash.transactions.map((t) => (
              <li
                key={t.id}
                className={`flex items-center justify-between gap-2 py-2 ${t.cancelledAt ? "opacity-50" : ""}`}
              >
                <div className="min-w-0">
                  <p className={`font-medium ${t.cancelledAt ? "line-through" : ""}`}>{t.description}</p>
                  <p className="text-xs text-stone-500">
                    {formatDateTime(t.bookedAt)} · {t.createdBy.name}
                    {t.cancelledAt && " · storniert"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`font-semibold ${t.direction === "INCOME" ? "text-brand-700" : "text-red-700"}`}>
                    {t.direction === "INCOME" ? "+" : "−"}
                    {formatEuro(t.amountCents)}
                  </span>
                  {book && !t.cancelledAt && (
                    <ActionForm action={cancelTransactionAction}>
                      <input type="hidden" name="transactionId" value={t.id} />
                      <SubmitButton className="text-xs text-stone-500 hover:text-red-700 hover:underline">
                        Storno
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {view === "bezahlt" && (
        <Card title="Bezahlt">
          {cash.paid.length === 0 && <EmptyState>Noch nichts bezahlt.</EmptyState>}
          <ul className="divide-y divide-stone-100 text-sm">
            {cash.paid.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{p.player.name}</p>
                  <p className="text-xs text-stone-500">
                    {entryTitle(p)} · verbucht {formatDateTime(p.updatedAt)}
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
      )}

      {view === "einstellungen" && book && (
        <Card title="PayPal-Link für Spieler">
          <p className="mb-3 text-sm text-stone-600">
            Mit deinem PayPal.me-Namen sehen Spieler mit offenem Betrag einen Button „Per PayPal zahlen“, der PayPal
            direkt mit dem Betrag öffnet. Der Name steht nur in der Datenbank, nicht im Code.
          </p>
          <ActionForm action={setPaypalAction} className="space-y-3">
            <Field label="PayPal.me-Name oder Link" hint="Leer lassen und speichern entfernt den Button.">
              <input
                name="paypalMe"
                defaultValue={paypalMe ?? ""}
                placeholder="z. B. paypal.me/deinname"
                className={inputClass}
              />
            </Field>
            <SubmitButton className={btn.primary}>Speichern</SubmitButton>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
