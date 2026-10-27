# Architekturbegründung

> Entwurf für P3. Bitte im Team prüfen und ergänzen.

## Entscheidung

SquadHQ ist eine **Client-Server-Webanwendung mit Schichtenarchitektur** (Layered Architecture) innerhalb eines Next.js-Projekts:

1. **Präsentation:** React-Server-Components unter `src/app` (mobile-first, Tailwind)
2. **Anwendungsschicht:** Server Actions (`src/app/actions.ts`), prüfen Rollen und rufen Services auf
3. **Service-Schicht:** AttendanceService, PenaltyEngine, AuditService (`src/services`)
4. **Fachlogik:** reine Funktionen ohne Datenbank (`src/domain`)
5. **Datenzugriff:** Prisma ORM auf PostgreSQL (Supabase)

Jede Schicht ruft nur die darunterliegende auf. Die Komponenten zeigt [komponenten.md](komponenten.md).

## Begründung

| Anforderung / Qualitätsziel | Wie die Architektur es erfüllt |
| --- | --- |
| Mobile Nutzung am Spielfeldrand (Interviews Spieler, Trainer) | Web-App statt nativer App: läuft auf jedem Smartphone ohne Installation; Server-Rendering hält die Seiten klein |
| Nachvollziehbare Kasse (Interview Kassenwart) | Alle Schreibzugriffe laufen über die Service-Schicht und werden dort im AuditLog protokolliert; Anwesenheit und Strafe werden in einer Transaktion geschrieben |
| Rechte je Rolle (REQ-SEC-01) | Rollenprüfung zentral vor jeder Server Action und Seite (`src/lib/auth.ts`), nicht verteilt im UI |
| Testbarkeit (TDD für Kassenlogik, P1) | Fachregeln liegen getrennt von DB und UI in `src/domain` und sind ohne Infrastruktur unit-testbar |
| Änderbarkeit (Katalog ändert sich jede Saison) | Strafbeträge sind Daten (`PenaltyRule`), nicht Code |
| Geringer Betriebsaufwand für ein Studententeam | Ein Repository, ein Deployment (Vercel), verwaltete Datenbank (Supabase) |

## Entwurfsprinzipien

- **Information Hiding / Modularisierung** (Parnas 1972): Das UI kennt keine Datenbanktabellen, nur Service-Funktionen. Der Wechsel von Demo-Anmeldung zu Supabase Auth betrifft nur `src/lib/auth.ts`.
- **Lose Kopplung:** Services sprechen über klar benannte Funktionen miteinander; die PenaltyEngine kennt die UI nicht.
- **Hohe Kohäsion:** jede Service-Datei hat genau einen fachlichen Zweck (Rückmeldungen, Strafen, Protokoll).
- **Service Layer** (Fowler 2002): Geschäftsabläufe wie „Anwesenheit setzen und Strafe abgleichen“ liegen an einer Stelle statt in mehreren Seiten.

## Verworfene Alternativen

| Alternative | Warum nicht |
| --- | --- |
| Native App (React Native / Flutter) | App-Store-Hürde für Spieler, zweite Codebasis, im Team weniger Erfahrung |
| Getrenntes Backend (z. B. Express-REST-API) | mehr Deployments und Schnittstellen-Code ohne Mehrwert bei einem Team und einem Client |
| Microservices | für 5 Personen und 6 Entitäten unverhältnismäßiger Betriebsaufwand |
| Supabase direkt aus dem Browser (ohne eigene Service-Schicht) | Geschäftsregeln und Audit-Log wären im Client und damit manipulierbar |

## Quellen

- L. Bass, P. Clements, R. Kazman: *Software Architecture in Practice*, 4. Aufl., Addison-Wesley, 2021 (Architekturstile, Qualitätsattribute)
- D. L. Parnas: „On the Criteria to Be Used in Decomposing Systems into Modules“, *Communications of the ACM* 15(12), 1972
- M. Fowler: *Patterns of Enterprise Application Architecture*, Addison-Wesley, 2002 (Service Layer)
