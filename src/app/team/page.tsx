import Link from "next/link";
import { headers } from "next/headers";
import { can, requireMember } from "@/lib/auth";
import { ROLE_HINT, ROLE_LABEL } from "@/lib/format";
import { listMembers } from "@/services/teamService";
import { Avatar, Badge, Card, Field, PageHeader, btn, inputClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/SubmitButton";
import { ShareButton } from "@/components/ShareButton";
import {
  addMemberAction,
  changeRoleAction,
  regenerateCodeAction,
  removeMemberAction,
  renameTeamAction,
  setGuardianAction,
} from "./actions";

const ROLE_ORDER = ["TRAINER", "ASSISTANT", "CASHIER", "PLAYER", "GUARDIAN"] as const;

async function origin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
}

/**
 * Team (#51, REQ-SEC-01): Mitgliederübersicht mit Rolle, Position und Kontakt für alle.
 * Trainer: Team-Code und Einladung, Rollen vergeben, Stellvertreter, Mitglieder ohne Konto, entfernen.
 */
export default async function TeamPage() {
  const user = await requireMember();
  const members = await listMembers(user.teamId);
  const admin = can(user, "team.verwalten");
  const invite = `${await origin()}/registrieren?code=${user.team.joinCode}`;
  const accountHolders = members.filter((m) => m.authId || user.team.isDemo);

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${user.team.name} · ${members.length} Mitglieder`}
        action={
          <Link href="/team/statistik" className={`${btn.small} bg-white ring-1 ring-stone-300`}>
            Statistik
          </Link>
        }
      />

      {admin && (
        <section className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-sm text-white/70">Team-Code zum Beitreten</p>
          <p className="display my-1 text-5xl tracking-[0.2em] text-accent">{user.team.joinCode}</p>
          <p className="mb-4 text-sm text-white/70">
            Neue Mitglieder registrieren sich mit diesem Code und sind dann Spieler. Rollen vergibst du unten.
          </p>
          <ShareButton
            text={`Komm in unser Team „${user.team.name}“ bei SquadHQ! Team-Code: ${user.team.joinCode}`}
            url={invite}
          />
          <ActionForm action={regenerateCodeAction} className="mt-2 text-center">
            <SubmitButton className="text-xs text-white/60 hover:text-white hover:underline">
              Neuen Code erzeugen (alter wird ungültig)
            </SubmitButton>
          </ActionForm>
        </section>
      )}

      {ROLE_ORDER.map((role) => {
        const group = members.filter((m) => m.role === role);
        if (group.length === 0) return null;
        return (
          <Card key={role} title={`${ROLE_LABEL[role]} (${group.length})`}>
            <ul className="divide-y divide-stone-100">
              {group.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {m.name}
                        {m.shirtNumber ? <span className="ml-1 text-stone-400">#{m.shirtNumber}</span> : null}
                        {m.id === user.id && <span className="ml-1 text-xs text-stone-400">(du)</span>}
                      </p>
                      <p className="text-xs text-stone-500">
                        {[
                          m.position,
                          !m.authId ? "ohne eigenes Konto" : null,
                          m.managedBy ? `vertreten durch ${m.managedBy.name}` : null,
                          m.managed.length ? `vertritt ${m.managed.map((x) => x.name).join(", ")}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {m.phone && (
                        <a
                          href={`tel:${m.phone.replace(/\s/g, "")}`}
                          className={`${btn.small} bg-stone-100`}
                          aria-label={`${m.name} anrufen`}
                        >
                          📞
                        </a>
                      )}
                      {m.phone && (
                        <a
                          href={`https://wa.me/${m.phone.replace(/\D/g, "").replace(/^0/, "49")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${btn.small} bg-stone-100`}
                          aria-label={`${m.name} per WhatsApp schreiben`}
                        >
                          💬
                        </a>
                      )}
                    </div>
                  </div>
                  {admin && (
                    <details className="mt-2 pl-12 text-sm">
                      <summary className="cursor-pointer font-medium text-brand-700">Verwalten</summary>
                      <div className="mt-2 space-y-3 rounded-xl bg-stone-50 p-3">
                        <ActionForm action={changeRoleAction} className="space-y-1">
                          <input type="hidden" name="userId" value={m.id} />
                          <p className="text-xs font-semibold uppercase text-stone-500">Rolle</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ROLE_ORDER.map((r) => (
                              <SubmitButton
                                key={r}
                                name="role"
                                value={r}
                                current={m.role}
                                className={`${btn.small} bg-white ring-1 ring-stone-300`}
                              >
                                {ROLE_LABEL[r]}
                              </SubmitButton>
                            ))}
                          </div>
                          <p className="text-xs text-stone-500">{ROLE_HINT[m.role]}</p>
                        </ActionForm>
                        {(m.role === "PLAYER" || m.role === "CASHIER") && (
                          <ActionForm action={setGuardianAction} className="flex flex-wrap items-end gap-2">
                            <input type="hidden" name="userId" value={m.id} />
                            <Field label="Stellvertreter (sagt für dieses Mitglied zu/ab)">
                              <select
                                name="managedById"
                                defaultValue={m.managedById ?? ""}
                                className={`${inputClass} py-2`}
                              >
                                <option value="">niemand</option>
                                {accountHolders
                                  .filter((x) => x.id !== m.id)
                                  .map((x) => (
                                    <option key={x.id} value={x.id}>
                                      {x.name}
                                    </option>
                                  ))}
                              </select>
                            </Field>
                            <SubmitButton className={`${btn.small} bg-ink text-white`}>Speichern</SubmitButton>
                          </ActionForm>
                        )}
                        {m.id !== user.id && (
                          <ActionForm action={removeMemberAction}>
                            <input type="hidden" name="userId" value={m.id} />
                            <SubmitButton className="text-xs font-medium text-red-700 hover:underline">
                              Aus dem Team entfernen
                            </SubmitButton>
                          </ActionForm>
                        )}
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      {admin && (
        <>
          <Card title="Mitglied ohne Konto anlegen">
            <p className="mb-3 text-sm text-stone-600">
              Für Spieler ohne Smartphone oder Jugendspieler: Ein Stellvertreter (z. B. Elternteil mit eigenem Konto)
              sagt für sie zu und ab und sieht ihr Kassenkonto.
            </p>
            <ActionForm action={addMemberAction} className="space-y-3">
              <Field label="Name">
                <input name="name" required className={inputClass} />
              </Field>
              <Field label="Stellvertreter (optional)">
                <select name="managedById" defaultValue="" className={inputClass}>
                  <option value="">niemand (Trainer trägt ein)</option>
                  {accountHolders.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
              <SubmitButton className={btn.secondary}>Anlegen</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Teamname">
            <ActionForm action={renameTeamAction} className="flex flex-wrap gap-2">
              <input
                name="name"
                defaultValue={user.team.name}
                required
                minLength={3}
                className={`${inputClass} flex-1`}
              />
              <SubmitButton className={btn.secondary}>Speichern</SubmitButton>
            </ActionForm>
          </Card>
        </>
      )}
      {!admin && (
        <p className="text-center text-xs text-stone-500">
          <Badge tone="gray">{ROLE_LABEL[user.role]}</Badge> {ROLE_HINT[user.role]}
        </p>
      )}
    </>
  );
}
