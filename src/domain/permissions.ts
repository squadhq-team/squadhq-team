/**
 * REQ-SEC-01: Rechte-Tabelle. Welche Rolle darf was? Reine Fachlogik, damit sie per Unit-Test prüfbar ist.
 * Seiten, Navigation und Server Actions fragen nur über `can()` (src/lib/auth.ts) ab.
 */

export type Role = "TRAINER" | "ASSISTANT" | "CASHIER" | "PLAYER" | "GUARDIAN";

export type Permission =
  /** Termine anlegen, bearbeiten, absagen, Spielplan importieren, Aufstellung */
  | "termine.verwalten"
  /** Anwesenheit nach dem Termin bestätigen */
  | "anwesenheit.bestaetigen"
  /** Strafvorschläge freigeben oder verwerfen (zweite Stufe des Zwei-Stufen-Workflows) */
  | "strafen.freigeben"
  /** Strafe aus dem Katalog vergeben (Trainer direkt offen, sonst als Vorschlag) */
  | "strafen.vergeben"
  /** Strafenkatalog des Teams pflegen */
  | "katalog.pflegen"
  /** Teamkasse aller Mitglieder ansehen */
  | "kasse.ansehen"
  /** Zahlungen, Einnahmen/Ausgaben, Beiträge, Mahngebühr erlassen, PayPal-Link */
  | "kasse.buchen"
  /** Protokoll (Audit-Log) lesen */
  | "protokoll.lesen"
  /** Mitglieder verwalten: Rollen, Team-Code, entfernen, Mitglieder ohne Konto, Stellvertreter */
  | "team.verwalten"
  /** Ankündigungen schreiben und Umfragen anlegen */
  | "news.schreiben"
  /** Selbst zu- und absagen, eigenes Kassenkonto (gehört zum Kader) */
  | "kader";

const RIGHTS: Record<Role, Permission[]> = {
  TRAINER: [
    "termine.verwalten",
    "anwesenheit.bestaetigen",
    "strafen.freigeben",
    "strafen.vergeben",
    "katalog.pflegen",
    "kasse.ansehen",
    "protokoll.lesen",
    "team.verwalten",
    "news.schreiben",
  ],
  ASSISTANT: ["termine.verwalten", "anwesenheit.bestaetigen", "strafen.vergeben", "news.schreiben"],
  CASHIER: [
    "strafen.vergeben",
    "katalog.pflegen",
    "kasse.ansehen",
    "kasse.buchen",
    "protokoll.lesen",
    "news.schreiben",
    "kader",
  ],
  PLAYER: ["kader"],
  GUARDIAN: [],
};

export function can(role: Role, permission: Permission): boolean {
  return RIGHTS[role].includes(permission);
}

/** Rollen, die zum Kader gehören: sie sagen zu/ab, stehen in der Anwesenheitsliste und können Strafen bekommen. */
export const SQUAD_ROLES: Role[] = (Object.keys(RIGHTS) as Role[]).filter((r) => can(r, "kader"));

/**
 * Darf `actor` für `member` zu- oder absagen? Man selbst (wenn im Kader), oder als eingetragener Stellvertreter.
 */
export function mayRespondFor(
  actor: { id: string; role: Role },
  member: { id: string; role: Role; managedById: string | null },
): boolean {
  if (!can(member.role, "kader")) return false;
  return member.id === actor.id || member.managedById === actor.id;
}

/**
 * Darf der Trainer `target` die Rolle `newRole` geben? Das Team darf nie ohne Trainer dastehen.
 */
export function roleChangeProblem(params: {
  target: { role: Role };
  newRole: Role;
  trainerCount: number;
}): string | null {
  if (params.target.role === "TRAINER" && params.newRole !== "TRAINER" && params.trainerCount <= 1)
    return "Das Team braucht mindestens einen Trainer. Gib zuerst jemand anderem die Rolle Trainer.";
  return null;
}

/**
 * Testkonten des Demo-Teams (prisma/testkonten.ts) haben E-Mails unter dieser Domain. `.test` ist reserviert
 * und kann keine Mails empfangen, deshalb verschickt die App dorthin nichts (z. B. „Passwort vergessen“).
 */
export const TEST_ACCOUNT_DOMAIN = "@squadhq.test";

export function isTestAccountEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith(TEST_ACCOUNT_DOMAIN);
}

/** Zeichen für Team-Codes: ohne leicht verwechselbare Zeichen (0/O, 1/I/L). */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

/** Neuer zufälliger Team-Code; `random` ist austauschbar, damit der Test deterministisch ist. */
export function generateJoinCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++)
    code += JOIN_CODE_ALPHABET[Math.floor(random() * JOIN_CODE_ALPHABET.length)];
  return code;
}

/** Eingabe eines Team-Codes vereinheitlichen (Leerzeichen, Kleinbuchstaben, Bindestrich egal). */
export function normalizeJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
