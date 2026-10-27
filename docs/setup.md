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
npm run db:reset   # legt Tabellen an und lädt Demo-Daten (löscht vorhandene Daten!)
npm run dev
```

## Supabase einrichten
1. Auf supabase.com ein Projekt anlegen (Region Frankfurt), Datenbank-Passwort merken.
2. Oben auf **Connect** klicken, dann die beiden Verbindungs-URLs kopieren:
   - **Transaction pooler** (Port 6543) als `DATABASE_URL`, mit `?pgbouncer=true` am Ende
   - **Direct connection** bzw. **Session pooler** (Port 5432) als `DIRECT_URL`
3. In `.env` eintragen und einmal `npm run db:reset` ausführen.

## Auf Vercel deployen
1. Auf vercel.com mit GitHub anmelden, **Add New → Project**, das Repository `squadhq-team/squadhq-team` importieren.
2. Unter **Environment Variables** `DATABASE_URL` und `DIRECT_URL` wie oben eintragen.
3. **Deploy** klicken. Der Build führt `prisma generate` automatisch aus.
4. Demo-Daten zurücksetzen geht lokal mit `npm run db:reset`, solange `.env` auf die Supabase-DB zeigt.

## Tests
```bash
npm test                                  # Unit-Tests
RUN_DB_TESTS=1 npm test                   # zusätzlich Ablauftests gegen die DB in DATABASE_URL
```
