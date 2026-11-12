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
npm run db:reset   # legt Tabellen an, lädt Demo-Daten und Testkonten, schützt das Audit-Log (löscht vorhandene Daten!)
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
4. **Eigener Mailversand (SMTP) und E-Mail-Bestätigung.** Der eingebaute Mailversand von Supabase schickt nur wenige Mails pro Stunde und ist nur für Tests gedacht. Für echte Nutzer ein eigenes Postfach eintragen, am einfachsten ein Gmail-Konto des Teams:
   1. Im Google-Konto die Bestätigung in zwei Schritten einschalten, dann unter https://myaccount.google.com/apppasswords ein **App-Passwort** erzeugen (16 Zeichen, nur einmal sichtbar).
   2. Supabase → Authentication → Emails → **SMTP Settings** → „Enable custom SMTP“: Host `smtp.gmail.com`, Port `587`, Benutzername = Gmail-Adresse, Passwort = App-Passwort, Absender = dieselbe Gmail-Adresse, Absendername `SquadHQ`. Speichern.
   3. Supabase → Authentication → **Rate Limits**: „Rate limit for sending emails“ auf z. B. 100 pro Stunde erhöhen (Gmail erlaubt etwa 500 Mails am Tag).
   4. Supabase → Authentication → Sign In / Providers → Email → **„Confirm email“ einschalten**. Neue Konten bekommen dann eine Mail und landen nach dem Klick auf den Link in der App; auf `/bestaetigen` lässt sich die Mail erneut anfordern.
   Ohne eigenes SMTP „Confirm email“ ausgeschaltet lassen: Dann ist man nach dem Registrieren sofort angemeldet. „Passwort vergessen“ braucht immer eine Mail.
5. **Optional, empfohlen: Mail-Links auf jedem Gerät gültig machen.** Supabase → Authentication → Emails → Templates. Im Template „Reset Password“ den Link ersetzen durch
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/passwort-neu`
   und in „Confirm signup“ durch `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`.
   Ohne diese Änderung funktioniert der Link nur im selben Browser, in dem er angefordert wurde.
6. **Datenbank:** `npm run db:reset` (oder ohne Datenverlust `npx prisma db push` und `npm run db:audit-schutz`). Neu dabei: Spalte `User.authId` und Row Level Security auf allen Tabellen, damit niemand über die REST-Schnittstelle von Supabase an die Tabellen kommt.

## Testkonten zum Ausprobieren
`npm run db:reset` legt bei einer Supabase-Datenbank drei Konten im Demo-Team an (`prisma/testkonten.ts`): `trainer@squadhq.test`, `spieler@squadhq.test` und `kassenwart@squadhq.test`, Passwort siehe [README](../README.md). Sie werden direkt in `auth.users` angelegt (bestätigt, ohne Mail) bzw. bei jedem Reset auf das bekannte Passwort zurückgesetzt. Im Demo-Team sind Passwort ändern, Team verlassen und Konto löschen gesperrt; an die Domain `.test` verschickt die App keine Mails. Lokal ohne Supabase gibt es die Tabelle `auth.users` nicht; ohne Supabase ist auch keine Anmeldung möglich. Die frühere Ein-Klick-Demo-Anmeldung ist seit 12.11.2026 ausgebaut, zum Ausprobieren dienen die Testkonten.

## Push-Benachrichtigungen und Erinnerungen
Neue, geänderte und abgesagte Termine, neue Strafen, Ankündigungen und Umfragen kommen als Push aufs Handy; einmal täglich (9 Uhr UTC, `vercel.json`) erinnert ein Job alle im Kader, die bei einem Termin mit Rückmeldefrist in den nächsten 30 Stunden noch nicht geantwortet haben.
1. Schlüssel einmal erzeugen: `npx web-push generate-vapid-keys`
2. In Vercel (Production) und lokal in `.env` eintragen: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (z. B. `mailto:` plus Team-Adresse) und `CRON_SECRET` (lange zufällige Zeichenkette; Vercel schickt sie beim Cron-Aufruf automatisch mit).
3. Neu deployen. Im Profil erscheint dann „Benachrichtigungen an“. Auf dem iPhone geht Push nur, wenn SquadHQ über „Teilen → Zum Home-Bildschirm“ hinzugefügt und von dort geöffnet wurde.
Ohne die Schlüssel läuft die App normal, nur ohne Push.

Weitere Schalter: `SITE_URL` legt die Adresse für Links in Mails fest (sonst die aufgerufene Adresse).

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
**Achtung:** `npm run db:reset` löscht alle Daten, auch alle echten Teams und Mitglieder. Sobald echte Nutzer in der App sind, für Schema-Änderungen nur noch die drei Befehle oben verwenden.

Ist das Audit-Log geschützt, lassen sich Protokolleinträge nicht mehr löschen. `npm run db:seed` allein bricht dann ab; `npm run db:reset` setzt die Datenbank komplett neu auf.

## Tests
```bash
npm test                                  # Unit-Tests
npm run check                             # Lint, Formatierung, Typen und Tests wie in der CI (siehe docs/coding-guidelines.md)
RUN_DB_TESTS=1 npm test                   # zusätzlich Ablauftests gegen die DB in DATABASE_URL (nur Test-DB, nicht Supabase-Live: Testdaten bleiben wegen des Audit-Log-Schutzes stehen)
```
