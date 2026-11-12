/**
 * Testkonten zum Ausprobieren ohne Registrierung (z. B. für die Betreuung der Lehrveranstaltung):
 * Trainer, Spieler und Kassenwart des Demo-Teams melden sich mit E-Mail und Passwort an (stehen in der README).
 *
 * Die Konten werden direkt in Supabase Auth (Tabelle auth.users) angelegt oder ihr Passwort zurückgesetzt und dann
 * mit den Demo-Personen verknüpft. Lokal ohne Supabase gibt es auth.users nicht: dann wird nichts angelegt (ohne
 * Supabase ist auch keine Anmeldung möglich). Läuft bei jedem `npm run db:reset` (prisma/seed.ts).
 */
import type { PrismaClient } from "@prisma/client";
import { TEST_ACCOUNT_DOMAIN } from "../src/domain/permissions";

export const TESTKONTO_PASSWORT = "SquadHQ-Test26";

export const TESTKONTEN = {
  trainer: `trainer${TEST_ACCOUNT_DOMAIN}`,
  spieler: `spieler${TEST_ACCOUNT_DOMAIN}`,
  kassenwart: `kassenwart${TEST_ACCOUNT_DOMAIN}`,
} as const;

/**
 * Legt für jede Person ein bestätigtes Supabase-Konto an (oder setzt das Passwort zurück) und verknüpft es.
 * Schlägt das fehl (z. B. fehlende Rechte), läuft der Seed trotzdem weiter und meldet den Fehler.
 */
export async function testkontenAnlegen(prisma: PrismaClient, personen: { userId: string; email: string }[]) {
  const [{ vorhanden }] = await prisma.$queryRaw<{ vorhanden: boolean }[]>`
    SELECT to_regclass('auth.users') IS NOT NULL AS vorhanden`;
  if (!vorhanden) {
    console.log("Kein Supabase Auth (lokal): Testkonten werden nicht angelegt.");
    return;
  }
  try {
    for (const p of personen) {
      const authId = await supabaseKonto(prisma, p.email);
      await prisma.user.update({ where: { id: p.userId }, data: { authId, email: p.email } });
    }
    console.log(`Testkonten bereit: ${personen.map((p) => p.email).join(", ")} (Passwort siehe README).`);
  } catch (e) {
    console.warn("Testkonten konnten nicht angelegt werden:", e);
  }
}

async function supabaseKonto(prisma: PrismaClient, email: string): Promise<string> {
  const vorhanden = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text FROM auth.users WHERE lower(email) = ${email} LIMIT 1`;
  if (vorhanden.length > 0) {
    const id = vorhanden[0].id;
    await prisma.$executeRaw`
      UPDATE auth.users
      SET encrypted_password = extensions.crypt(${TESTKONTO_PASSWORT}, extensions.gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          banned_until = NULL,
          updated_at = now()
      WHERE id = ${id}::uuid`;
    return id;
  }
  const [{ id }] = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', ${email},
      extensions.crypt(${TESTKONTO_PASSWORT}, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    )
    RETURNING id::text`;
  await prisma.$executeRaw`
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), ${id}::uuid, ${id},
      jsonb_build_object('sub', ${id}::text, 'email', ${email}::text, 'email_verified', true),
      'email', now(), now(), now()
    )`;
  return id;
}
