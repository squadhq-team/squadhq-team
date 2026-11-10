# Setup

## Stack
- Next.js 15 mit TypeScript (App Router, Server Actions)
- Tailwind CSS
- Prisma ORM
- PostgreSQL bei Supabase
- Vitest für Tests
- Deployment auf Vercel

## Lokal starten
Voraussetzung: Node.js 20 oder neuer und eine PostgreSQL-Datenbank (lokal oder Supabase).

```bash
npm install
cp .env.example .env
npm run db:reset   # legt Tabellen an, lädt Demo-Daten und schützt das Audit-Log (löscht vorhandene Daten!)
npm run dev
```

## Supabase einrichten
1. Auf supabase.com ein Projekt anlegen (Region Frankfurt), Datenbank-Passwort merken.
2. Oben auf **Connect** klicken, dann die beiden Verbindungs-URLs kopieren:
   - **Transaction pooler** (Port 6543) als `DATABASE_URL`, mit `?pgbouncer=true` am Ende
   - **Direct connection** bzw. **Session pooler** (Port 5432) als `DIRECT_URL`
3. In `.env` eintragen und einmal `npm run db:reset` ausführen.

## Anmeldung mit Supabase Auth einrichten (seit 10.11.2026)
Registrieren, Anmelden und „Passwort vergessen“ laufen über Supabase Auth. Passwörter liegen nur bei Supabase; unsere Tabelle `User` ist über `authId` mit dem Supabase-Konto verknüpft. Neue Konten sind Spieler.

1. **Schlüssel holen:** Supabase → Project Settings → API (bzw. „API Keys“): **Project URL** und **anon public** Key.
2. **In Vercel eintragen** (Project → Settings → Environment Variables, für Production und Preview):
   - `SUPABASE_URL` = Project URL, z. B. `https://abcd.supabase.co`
   - `SUPABASE_ANON_KEY` = anon public Key
   Lokal dieselben zwei Zeilen in `.env` eintragen.
3. **Adressen erlauben:** Supabase → Authentication → URL Configuration
   - Site URL: `https://squadhq-omega.vercel.app`
   - Redirect URLs: `https://squadhq-omega.vercel.app/**` und `http://localhost:3000/**`
4. **E-Mail-Bestätigung:** Supabase → Authentication → Sign In / Providers → Email → „Confirm email“.
   Der eingebaute Mailversand von Supabase schickt nur wenige Mails pro Stunde und ist für Tests gedacht. Solange kein eigener Mailserver (SMTP, z. B. Brevo oder Resend) eingetragen ist, „Confirm email“ **ausschalten**: Dann ist man nach dem Registrieren sofort angemeldet. „Passwort vergessen“ braucht immer eine Mail.
5. **Optional, empfohlen: Mail-Links auf jedem Gerät gültig machen.** Supabase → Authentication → Emails → Templates. Im Template „Reset Password“ den Link ersetzen durch
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/passwort-neu`
   und in „Confirm signup“ durch `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`.
   Ohne diese Änderung funktioniert der Link nur im selben Browser, in dem er angefordert wurde.
6. **Datenbank:** `npm run db:reset` (oder ohne Datenverlust `npx prisma db push` und `npm run db:audit-schutz`). Neu dabei: Spalte `User.authId` und Row Level Security auf allen Tabellen, damit niemand über die REST-Schnittstelle von Supabase an die Tabellen kommt.

Weitere Schalter: `DEMO_LOGIN=off` blendet die Demo-Anmeldung aus (für echte Nutzer). `AUTH_SECRET` signiert das Demo-Cookie (ohne Angabe wird ein Geheimnis aus `DATABASE_URL` abgeleitet). `SITE_URL` legt die Adresse für Links in Mails fest (sonst die aufgerufene Adresse).

## Auf Vercel deployen
1. Auf vercel.com mit GitHub anmelden, **Add New → Project**, das Repository `squadhq-team/squadhq-team` importieren.
2. Unter **Environment Variables** `DATABASE_URL` und `DIRECT_URL` wie oben eintragen.
3. **Deploy** klicken. Der Build führt `prisma generate` automatisch aus.
4. Demo-Daten zurücksetzen geht lokal mit `npm run db:reset`, solange `.env` auf die Supabase-DB zeigt.

Aktuelles Deployment: https://squadhq-omega.vercel.app (Vercel-Projekt `squadhq`, Region `arn1` neben der Supabase-DB in Stockholm, siehe `vercel.json`). Auf Vercel hängt an `DATABASE_URL` zusätzlich `&connection_limit=1`, damit die Serverless-Funktionen den Pooler nicht überlasten. Das Projekt ist noch nicht mit GitHub verbunden, neue Versionen also mit `npx vercel deploy --prod` veröffentlichen.

## Datenbank aktualisieren, ohne Daten zu löschen
Für die Live-Datenbank nach einer Schema- oder Katalogänderung:
```bash
npx prisma db push          # Schema übernehmen (z. B. Löschschutz des Audit-Logs)
npm run db:audit-schutz     # Audit-Log gegen Ändern und Löschen sperren (Datenbank-Trigger)
npm run db:sync-katalog     # Strafenkatalog an prisma/strafenkatalog.ts angleichen
```
Ist das Audit-Log geschützt, lassen sich Protokolleinträge nicht mehr löschen. `npm run db:seed` allein bricht dann ab; `npm run db:reset` setzt die Datenbank komplett neu auf.

## Tests
```bash
npm test                                  # Unit-Tests
npm run check                             # Lint, Formatierung, Typen und Tests wie in der CI (siehe docs/coding-guidelines.md)
RUN_DB_TESTS=1 npm test                   # zusätzlich Ablauftests gegen die DB in DATABASE_URL (nur Test-DB, nicht Supabase-Live: Testdaten bleiben wegen des Audit-Log-Schutzes stehen)
```
