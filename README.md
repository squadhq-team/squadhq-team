# SquadHQ

Web-App für Amateurteams: Trainingszusagen, Strafenkatalog und Teamkasse an einem Ort, statt WhatsApp-Gruppen und Zettelwirtschaft. Vorbild für den Funktionsumfang ist SpielerPlus, zugeschnitten auf die TSV Kronshagen 1. Herren.

Software-Projekt WS 2026/27, Hochschule Flensburg

**Live-Demo:** https://squadhq-omega.vercel.app

## Team
| Name | Rolle |
|---|---|
| Abbas Sharba | Requirements |
| Kevin Wolfram | Architektur & Entwurf |
| Jegor Geer | Implementierung |
| Ömer-Faruk Simsek | QA/Testing |
| Kirill Korsun | Management |

## Tech-Stack
Next.js 15 (TypeScript), Tailwind CSS, Prisma, PostgreSQL (Supabase), Vitest, Deployment auf Vercel

## Schnellstart
```bash
npm install
cp .env.example .env      # DATABASE_URL / DIRECT_URL eintragen
npm run db:reset          # Tabellen anlegen und Demo-Daten laden
npm run dev               # http://localhost:3000
npm test                  # Unit-Tests
```
Details, Supabase und Vercel: [docs/setup.md](docs/setup.md). Ablauf für die Präsentation: [docs/demo-ablauf.md](docs/demo-ablauf.md).

## Code-Struktur
- `src/app` – Seiten (Spieler, Trainer, Demo-Anmeldung) und Server Actions
- `src/services` – AttendanceService, PenaltyEngine, AuditService
- `src/domain` – reine Fachlogik (unit-getestet)
- `src/lib` – Datenbank-Client, Rollenprüfung, Formatierung
- `prisma` – Datenmodell und Demo-Daten
- `tests` – Vitest-Tests

## MVPs
1. Terminplanung & 1-Klick-Zusage (Dabei, Fehle, Unsicher)
2. Trainer-Dashboard & Anwesenheitsliste
3. Automatisierter Strafenvorschlag mit Trainer-Bestätigung (20 € nach TSVK-Katalog)
4. Digitale Teamkasse: offene und bezahlte Strafen
5. Zahlungsverfolgung durch den Kassenwart (bar oder PayPal)
6. Lückenloses Audit-Log

Details und Gesamtumfang: [docs/anforderungen/features-und-mvps.md](docs/anforderungen/features-und-mvps.md)

## Dokumentation
- `docs/anforderungen` – finale Features und MVPs, Strafenkatalog TSVK 2026/27
- `docs/interviews` – Interviews und Feedback-Matrix
- `docs/architektur` – Komponenten, Sequenz, Klassendiagramm, ER-Modell, Architekturbegründung
- `docs/traceability.md` – Feedback → Anforderung → Code → Test
- `docs/testing` – Akzeptanzkriterien und Teststrategie
- `docs/team.md` – Rollen und Arbeitsweise

## Projekt-Board
Aufgaben, Sprints und Fortschritt: [SquadHQ Sprint-Board (GitHub Projects)](https://github.com/users/Kirillv2/projects/1)
