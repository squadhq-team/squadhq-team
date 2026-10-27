# SquadHQ

Web-App für Amateurteams: Trainingszusagen, Strafenkatalog und Teamkasse an einem Ort, statt WhatsApp-Gruppen und Zettelwirtschaft.

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

## Dokumentation
- `docs/interviews` – Interviews und Feedback-Matrix
- `docs/architektur` – Komponenten, Sequenz, Klassendiagramm, ER-Modell, Architekturbegründung
- `docs/traceability.md` – Feedback → Anforderung → Code → Test
- `docs/testing` – Akzeptanzkriterien und Teststrategie
- `docs/team.md` – Rollen und Arbeitsweise

## Projekt-Board
Aufgaben, Sprints und Fortschritt: [SquadHQ Sprint-Board (GitHub Projects)](https://github.com/users/Kirillv2/projects/1)
