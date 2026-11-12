# SquadHQ

Web-App für Amateur-Fußballteams: Termine mit 1-Klick-Zusage, Strafenkatalog, Teamkasse, Ankündigungen und Chat an einem Ort, statt WhatsApp-Gruppen und Zettelwirtschaft. Vorbild für den Funktionsumfang ist SpielerPlus. Erster Einsatz bei der TSV Kronshagen 1. Herren, nutzbar für beliebig viele Teams (jedes Team hat einen eigenen Team-Code).

Software-Projekt WS 2026/27, Hochschule Flensburg

**Live-Demo:** https://squadhq-omega.vercel.app

## Zum Ausprobieren: Testkonten
Wer die App nur testen möchte, muss sich nicht registrieren. Diese drei Konten gehören zum Demo-Team „TSV Kronshagen 1. Herren (Demo)“ mit Terminen, Strafen und Kasse:

| Rolle | E-Mail | Passwort |
|---|---|---|
| Trainer (Jan Petersen) | `trainer@squadhq.test` | `SquadHQ-Test26` |
| Spieler (Paul Thomsen) | `spieler@squadhq.test` | `SquadHQ-Test26` |
| Kassenwart (Karl Brandt) | `kassenwart@squadhq.test` | `SquadHQ-Test26` |

Auf der Startseite unter „Anmelden“ E-Mail und Passwort eingeben. Noch schneller geht es darunter über **Demo ansehen** (Person anklicken, ohne Passwort). Im Demo-Team sind Passwort ändern, Team verlassen und Konto löschen abgeschaltet, damit es für alle gleich bleibt. Ein eigenes Team bekommt man über **Registrieren** und dann **Neues Team gründen**.

Die Testkonten legt `npm run db:reset` automatisch an (`prisma/testkonten.ts`), sobald die Datenbank bei Supabase liegt. Lokal ohne Supabase gibt es nur die Demo-Anmeldung.

## Team
| Name | Rolle |
|---|---|
| Abbas Sharba | Requirements |
| Kevin Wolfram | Architektur & Entwurf |
| Jegor Geer | Implementierung |
| Ömer-Faruk Simsek | QA/Testing |
| Kirill Korsun | Management |

## Tech-Stack
Next.js 15 (TypeScript, App Router, Server Actions), Tailwind CSS, Prisma, PostgreSQL (Supabase), Supabase Auth, Vitest, Deployment auf Vercel

## App lokal ausführen
**Voraussetzungen:** [Node.js](https://nodejs.org) 20 oder neuer, Git und eine PostgreSQL-Datenbank (lokal installiert oder ein kostenloses Supabase-Projekt).

```bash
git clone https://github.com/squadhq-team/squadhq-team.git
cd squadhq-team
npm install               # Abhängigkeiten installieren
cp .env.example .env      # danach in .env DATABASE_URL und DIRECT_URL eintragen
npm run db:reset          # Tabellen anlegen und Demo-Daten laden (löscht vorhandene Daten!)
npm run dev               # App starten: http://localhost:3000
```
Im Browser http://localhost:3000 öffnen und unter „Demo ansehen“ eine Person wählen. Für Registrieren und Anmelden mit E-Mail und Passwort zusätzlich `SUPABASE_URL` und `SUPABASE_ANON_KEY` in `.env` eintragen (siehe [docs/setup.md](docs/setup.md)).

Weitere Befehle:
```bash
npm run build && npm start   # Produktionsversion bauen und starten
npm test                     # Unit-Tests
npm run check                # Lint, Formatierung, Typen und Tests (vor jedem Commit, wie in der CI)
RUN_DB_TESTS=1 npm test      # zusätzlich Ablauftests gegen die Datenbank (nur Test-DB, nicht Live)
```
Details zu Supabase, Vercel, Mailversand und Push-Benachrichtigungen: [docs/setup.md](docs/setup.md). Regeln für Code, Commits und Reviews: [docs/coding-guidelines.md](docs/coding-guidelines.md). Ablauf für die Präsentation: [docs/demo-ablauf.md](docs/demo-ablauf.md).

## Code-Struktur
Fünf Schichten, gleiche Namen wie im [Komponentendiagramm](docs/architektur/komponenten.md) (siehe [Namensliste](docs/architektur/namensliste.md)):
- `src/app` – Präsentation (Seiten Start, Termine, Kasse, Team, Chat, Neuigkeiten, Profil, Protokoll, Anmeldung) und Server Actions („Eingaben verarbeiten“)
- `src/lib/auth.ts` – Einloggen & Rechteprüfung (Rechte-Tabelle in `src/domain/permissions.ts`)
- `src/services` – Teams & Mitglieder (TeamService), Zu-/Absagen & Anwesenheit (AttendanceService), Strafen (PenaltyEngine), Kasse & Zahlungen (PaymentService), Neuigkeiten & Chat (NewsService), Statistik, Push, Protokollierung (AuditService)
- `src/domain` – Regelverwaltung: Rechte, Strafenkatalog, Fälligkeit, Mahngebühr, Saldo, Kalender-Import (reine Funktionen, unit-getestet)
- `src/components` – UI-Bausteine, u. a. Buttons mit Lade- und Gespeichert-Anzeige
- `src/lib` – außerdem Datenbank-Client (Prisma), Supabase und Formatierung
- `prisma` – Datenmodell, Demo-Daten und Testkonten
- `tests` – Vitest-Tests

## MVPs
1. Terminplanung & 1-Klick-Zusage (Dabei, Fehle, Unsicher)
2. Trainer-Dashboard & Anwesenheitsliste
3. Automatisierter Strafenvorschlag mit Trainer-Bestätigung (20 € nach TSVK-Katalog)
4. Digitale Teamkasse: offene und bezahlte Strafen
5. Zahlungsverfolgung durch den Kassenwart (bar oder PayPal)
6. Lückenloses Audit-Log

Dazu seit dem Sprint „Features & Design“: Teams mit Team-Code und Rollen (Trainer, Betreuer, Kassenwart, Spieler, Elternteil/Stellvertreter), Spiele und Events mit Treffpunkt und Aufstellung, Spielplan-Import, manuelle Strafen, automatische Mahngebühr, Beiträge, Einnahmen und Ausgaben, PayPal-Link, Ankündigungen, Umfragen, Chat, Statistik und Push-Erinnerungen.

Details und Gesamtumfang: [docs/anforderungen/features-und-mvps.md](docs/anforderungen/features-und-mvps.md)

## Dokumentation
- `docs/anforderungen` – finale Features und MVPs, Strafenkatalog TSVK 2026/27
- `docs/interviews` – Interviews und Feedback-Matrix
- `docs/architektur` – Komponenten, Sequenz, Klassendiagramm, ER-Modell, Architekturbegründung
- `docs/traceability.md` – Feedback → Anforderung → Code → Test
- `docs/testing` – Akzeptanzkriterien und Teststrategie
- `docs/coding-guidelines.md` – Coding-Standards, Commit- und Review-Regeln (automatisch geprüft per GitHub Actions)
- `docs/team.md` – Rollen und Arbeitsweise

## Projekt-Board
Aufgaben, Sprints und Fortschritt: [SquadHQ Sprint-Board (GitHub Projects)](https://github.com/users/Kirillv2/projects/1)
