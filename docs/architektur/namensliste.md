# Namensliste: ein Name je Baustein in allen Diagrammen

> Seit dem P3-Feedback (09.11.2026) gilt: Jeder Baustein hat genau **einen** deutschen Namen, der sagt, was er tut, und genau **einen** Codenamen. Beide stehen in jedem Diagramm gleich da. Wer ein Diagramm ändert, nimmt die Namen aus dieser Liste.

## Komponenten (Komponentendiagramm, Sequenzdiagramm, Klassendiagramm)

| Schicht | Name in den Diagrammen | Codename | Datei im Code |
| --- | --- | --- | --- |
| 1 Präsentation | Einloggen & Registrieren | Seiten `/`, `/registrieren`, `/bestaetigen`, `/passwort-vergessen`, `/passwort-neu`, `/willkommen`, Route `/auth/callback` | `src/app/page.tsx`, `src/app/registrieren/…`, `src/app/bestaetigen/…`, `src/app/passwort-…/…`, `src/app/willkommen/…`, `src/app/auth/callback/route.ts` |
| 1 Präsentation | Startseite | Seite `/start` | `src/app/start/page.tsx` |
| 1 Präsentation | Termine | Seiten `/termine`, `/termine/neu`, `/termine/[id]`, `/termine/[id]/bearbeiten`, `/termine/import` | `src/app/termine/…` |
| 1 Präsentation | Kasse | Seiten `/kasse`, `/kasse/strafe`, `/kasse/katalog`, `/kasse/beitrag`, `/kasse/buchung` | `src/app/kasse/…` |
| 1 Präsentation | Team & Profil | Seiten `/team`, `/team/statistik`, `/profil` | `src/app/team/…`, `src/app/profil/page.tsx` |
| 1 Präsentation | Neuigkeiten & Chat | Seiten `/neuigkeiten`, `/neuigkeiten/umfrage`, `/chat` | `src/app/neuigkeiten/…`, `src/app/chat/page.tsx` |
| 1 Präsentation | Protokoll-Ansicht | Seite `/protokoll` | `src/app/protokoll/page.tsx` |
| 1 Präsentation | Erinnerungs-Job | Route `/api/cron/erinnerungen` | `src/app/api/cron/erinnerungen/route.ts`, Zeitplan in `vercel.json` |
| 2 Anwendung | Eingaben verarbeiten | Server Actions (Module `ServerActions`, `TerminActions`, `KasseActions`, `TeamActions`, `NeuigkeitenActions`) | `src/app/actions.ts`, `src/app/termine/actions.ts`, `src/app/kasse/actions.ts`, `src/app/team/actions.ts`, `src/app/neuigkeiten/actions.ts` |
| 2 Anwendung | Einloggen & Rechteprüfung | Auth | `src/lib/auth.ts` |
| 2 Anwendung | Registrierung | Registration | `src/lib/registration.ts` |
| 3 Services | Teams & Mitglieder | TeamService | `src/services/teamService.ts` |
| 3 Services | Zu-/Absagen & Anwesenheit | AttendanceService | `src/services/attendanceService.ts` |
| 3 Services | Strafen vorschlagen & freigeben | PenaltyEngine | `src/services/penaltyEngine.ts` |
| 3 Services | Teamkasse & Zahlungen | PaymentService | `src/services/paymentService.ts` |
| 3 Services | Neuigkeiten & Chat | NewsService | `src/services/newsService.ts` |
| 3 Services | Statistik | StatsService | `src/services/statsService.ts` |
| 3 Services | Benachrichtigungen | PushService, ReminderService, MailService | `src/services/pushService.ts`, `src/services/reminderService.ts`, `src/services/mailService.ts`, Service Worker `public/sw.js` |
| 3 Services | Protokollierung | AuditService | `src/services/auditService.ts` |
| 4 Fachlogik | Rechte | Permissions | `src/domain/permissions.ts` |
| 4 Fachlogik | Regelverwaltung | Penalties | `src/domain/penalties.ts` |
| 4 Fachlogik | Spielplan-Import | Ics | `src/domain/ics.ts` |
| 4 Fachlogik | Erinnerungs-Empfänger | Reminders | `src/domain/reminders.ts` |
| 5 Datenzugriff | Datenbankzugriff | Prisma Client | `src/lib/db.ts` |
| – | Datenbank | PostgreSQL (Supabase) | `prisma/schema.prisma` |
| – | Supabase Auth (extern) | Supabase Auth | `src/lib/supabase.ts`, `src/middleware.ts` |
| – | Push-Dienst des Browsers (extern) | Web Push | Bibliothek `web-push` |
| – | Mailserver (extern) | SMTP, z. B. Gmail | Bibliothek `nodemailer` |

Die fünf Schichten sind dieselben wie auf der Folie „Schichtenarchitektur“ und in der [Architekturbegründung](architekturbegruendung.md). Umbenannt im Sprint „Features & Design“ (12.11.2026): „Spieler-Ansicht“ und „Trainer-Dashboard“ sind in „Startseite“, „Termine“ und „Kasse“ aufgegangen (eine Oberfläche für alle Rollen, Inhalte je nach Recht), „Kassenwart-Ansicht“ heißt „Kasse“, „Einloggen & Rollenprüfung“ heißt „Einloggen & Rechteprüfung“, „Zahlungen verbuchen“ heißt „Teamkasse & Zahlungen“.

## Rollen (Rechte-Tabelle, `src/domain/permissions.ts`)

| Anzeige in der App | Rolle (`Role`) | Gehört zum Kader (sagt zu, bekommt Strafen) |
| --- | --- | --- |
| Trainer | `TRAINER` | nein |
| Betreuer | `ASSISTANT` | nein |
| Kassenwart | `CASHIER` | ja |
| Spieler | `PLAYER` | ja |
| Elternteil/Stellvertreter | `GUARDIAN` | nein (sagt für eingetragene Mitglieder zu) |

## Fachklassen und Tabellen (Klassendiagramm, ER-Modell, Prisma)

| Bedeutung | Klasse (Klassendiagramm, Prisma-Modell) | Tabelle (ER-Modell) |
| --- | --- | --- |
| Mannschaft mit Team-Code | `Team` | `TEAM` |
| Person im Team (Rolle siehe oben) | `User` | `USER` |
| Termin (Training, Spiel, Turnier, Feier, Sonstiges) | `TrainingSession` | `TRAINING_SESSION` |
| Rückmeldung bzw. Anwesenheit, Aufstellung | `Attendance` | `ATTENDANCE` |
| Position im Strafenkatalog | `PenaltyRule` | `PENALTY_RULE` |
| Forderung: Strafe, Mahngebühr oder Beitrag | `PenaltyEntry` | `PENALTY_ENTRY` |
| Einnahme oder Ausgabe im Kassenbuch | `CashTransaction` | `CASH_TRANSACTION` |
| Protokolleintrag (Audit-Log) | `AuditLog` | `AUDIT_LOG` |
| Ankündigung | `Announcement` | `ANNOUNCEMENT` |
| Umfrage, Antwortmöglichkeit, Stimme | `Poll`, `PollOption`, `PollVote` | `POLL`, `POLL_OPTION`, `POLL_VOTE` |
| Chat-Nachricht | `ChatMessage` | `CHAT_MESSAGE` |
| Push-Abo eines Geräts | `PushSubscription` | `PUSH_SUBSCRIPTION` |

Die Tabellennamen im ER-Modell sind die Prisma-Modellnamen in Großbuchstaben mit Unterstrich. Beziehungsnamen sind in Klassendiagramm und ER-Modell gleich: *Mitglieder, plant, Katalog, Forderungen, Kassenbuch, Protokoll, Ankündigungen, Umfragen, Chat, Stellvertretung, meldet, hat, erstellt, schuldet, legt an, Grundlage, Anlass, Mahngebühr, bucht, Verlauf, Anwesenheitsverlauf, Buchungsverlauf, betrifft, Akteur, schreibt, fragt, Antworten, Stimmen, stimmt ab, schreibt im Chat, Geräte*.

## Zustände einer Strafe (Zustandsautomat, Code, Datenbank)

| Anzeige in der App | Zustand (`PenaltyStatus`) |
| --- | --- |
| Wartet auf Freigabe | `PENDING_APPROVAL` |
| Offen | `OPEN` |
| Teilweise bezahlt | `PARTIAL` |
| Bezahlt (bar) | `PAID_CASH` |
| Bezahlt (PayPal) | `PAID_PAYPAL` |
| Storniert | `CANCELLED` |

## Next.js: Modelle und Klassen

Der Code enthält **keine** Klassen im Sinne von `class …`. Im Klassendiagramm gilt deshalb:

- `«Prisma-Modell»`: Fachklasse = Modell in `prisma/schema.prisma`; Prisma erzeugt daraus TypeScript-Typen, die Objekte sind reine Daten ohne Methoden.
- `«Modul»`: Service bzw. Bibliothek = eine TypeScript-Datei mit exportierten Funktionen; im Diagramm als Klasse mit Operationen gezeichnet, jede Operation ist eine exportierte Funktion.
- `«enumeration»`: Aufzählung = `enum` in `prisma/schema.prisma`.
