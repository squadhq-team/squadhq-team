# Architekturbegründung

> Stand Sprint „Features & Design“, 12.11.2026 (nach dem P3-Feedback überarbeitet, ohne geplante Komponenten): Die fünf Schichten und ihre Komponenten sind genau die aus dem [Komponentendiagramm](komponenten.md); Namen siehe [Namensliste](namensliste.md).

## Entscheidung

SquadHQ ist eine **Client-Server-Webanwendung mit Schichtenarchitektur** (Layered Architecture) innerhalb eines Next.js-Projekts:

| Schicht | Komponenten (Codename) | Ordner |
| --- | --- | --- |
| 1 Präsentation | Einloggen & Registrieren, Startseite, Termine, Kasse, Team & Profil, Neuigkeiten & Chat, Protokoll-Ansicht, Erinnerungs-Job | `src/app` (Seiten als React Server Components, auf dem Server gerendert, mobile-first) |
| 2 Anwendung | Eingaben verarbeiten (Server Actions), Einloggen & Rechteprüfung (Auth), Registrierung (Registration) | `src/app/**/actions.ts`, `src/lib/auth.ts`, `src/lib/registration.ts` |
| 3 Services | Teams & Mitglieder (TeamService), Zu-/Absagen & Anwesenheit (AttendanceService), Strafen vorschlagen & freigeben (PenaltyEngine), Teamkasse & Zahlungen (PaymentService), Neuigkeiten & Chat (NewsService), Statistik (StatsService), Benachrichtigungen (PushService), Protokollierung (AuditService) | `src/services` |
| 4 Fachlogik | Rechte (Permissions), Regelverwaltung (Penalties): Strafenkatalog, Fälligkeit, Saldo, Zahlung, Mahngebühr, Kassenstand; Spielplan-Import (Ics); reine Funktionen ohne Datenbank | `src/domain` |
| 5 Datenzugriff | Datenbankzugriff (Prisma Client) auf PostgreSQL (Supabase) | `src/lib/db.ts`, `prisma/schema.prisma` |

Abhängigkeiten zeigen nur nach unten, nie nach oben (gelockerte Schichtenarchitektur, *relaxed layering*): Seiten lesen über die Services und schreiben nur über die Server Actions; sie greifen weder auf die Fachlogik noch auf die Datenbank direkt zu. Auth und Registrierung lesen bzw. schreiben die Nutzer direkt über den Datenbankzugriff (überspringt Services und Fachlogik, zeigt aber nach unten). Die Fachlogik hängt von nichts ab. Die frühere Ausnahme (Demo-Anmeldung las die Nutzerliste direkt über Prisma) ist seit 09.11.2026 behoben. Die Komponenten zeigt [komponenten.md](komponenten.md), das Verhalten [sequenz-pen-02.md](sequenz-pen-02.md), den Detailentwurf [klassendiagramm.md](klassendiagramm.md) und das Datenmodell [er-modell.md](er-modell.md).

## Begründung

| Anforderung / Qualitätsziel | Wie die Architektur es erfüllt |
| --- | --- |
| Mobile Nutzung am Spielfeldrand (Interviews Spieler, Trainer) | Web-App statt nativer App: läuft auf jedem Smartphone ohne Installation; Server-Rendering hält die Seiten klein |
| Nachvollziehbare Kasse (Interview Kassenwart) | Alle Schreibzugriffe laufen über die Service-Schicht; jede Statusänderung einer Strafe, jede Zahlung und jede vom Trainer gesetzte Anwesenheit wird dort im AuditLog protokolliert; Anwesenheit und Strafe werden in einer Transaktion geschrieben |
| Rechte je Rolle (REQ-SEC-01), getrennte Teams | Rechte-Tabelle je Rolle als reine Fachlogik (`src/domain/permissions.ts`, unit-getestet); geprüft zentral in `src/lib/auth.ts` zu Beginn jeder geschützten Seite (`requireMember(recht)`) und Server Action (`assertMember(recht)`), nicht verteilt im UI; jede Service-Funktion bekommt die `teamId` und filtert danach |
| Testbarkeit (TDD für Kassenlogik, P1) | Fachregeln liegen getrennt von DB und UI in `src/domain` und sind ohne Infrastruktur unit-testbar |
| Änderbarkeit (Katalog ändert sich jede Saison) | Strafbeträge sind Daten (`PenaltyRule`), nicht Code |
| Geringer Betriebsaufwand für ein Studententeam | Ein Repository, ein Deployment (Vercel), verwaltete Datenbank (Supabase) |

## Entwurfsprinzipien

- **Information Hiding / Modularisierung** (Parnas 1972): Das UI kennt keine Datenbanktabellen, nur Service-Funktionen. Das hat sich zweimal bestätigt: Zu P4 kamen Registrierung und Login mit Passwort hinzu, am 10.11.2026 der Umstieg auf Supabase Auth. Beide Male änderten sich nur „Einloggen & Rechteprüfung“ (`src/lib/auth.ts`), „Registrierung“ und die Anmeldeseiten; alle übrigen Seiten und Services blieben unverändert.
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
| Eigene Anmeldung mit Passwort-Hash in `User` (P4-Stand bis 10.11.2026) | abgelöst durch Supabase Auth: Passwort vergessen, E-Mail-Bestätigung und sichere Sitzungen bräuchten sonst viel eigenen, sicherheitskritischen Code. Der Wechsel betraf wie vorhergesagt nur Auth, Registrierung und die Anmeldeseiten |

## Quellen

- L. Bass, P. Clements, R. Kazman: *Software Architecture in Practice*, 4. Aufl., Addison-Wesley, 2021 (Architekturstile, Qualitätsattribute)
- D. L. Parnas: „On the Criteria to Be Used in Decomposing Systems into Modules“, *Communications of the ACM* 15(12), 1972
- M. Fowler: *Patterns of Enterprise Application Architecture*, Addison-Wesley, 2002 (Service Layer)
