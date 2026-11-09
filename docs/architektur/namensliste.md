# Namensliste: ein Name je Baustein in allen Diagrammen

> Seit dem P3-Feedback (09.11.2026) gilt: Jeder Baustein hat genau **einen** deutschen Namen, der sagt, was er tut, und genau **einen** Codenamen. Beide stehen in jedem Diagramm gleich da. Wer ein Diagramm ändert, nimmt die Namen aus dieser Liste.

## Komponenten (Komponentendiagramm, Sequenzdiagramm, Klassendiagramm)

| Schicht | Name in den Diagrammen | Codename | Datei im Code |
| --- | --- | --- | --- |
| 1 Präsentation | Einloggen | Seite `/` | `src/app/page.tsx` |
| 1 Präsentation | Spieler-Ansicht | Seite `/spieler` | `src/app/spieler/page.tsx` |
| 1 Präsentation | Trainer-Dashboard | Seiten `/trainer`, `/trainer/training/[id]` | `src/app/trainer/…` |
| 1 Präsentation | Kassenwart-Ansicht (geplant P4) | – | – |
| 2 Anwendung | Eingaben verarbeiten | Server Actions (Klasse `ServerActions`) | `src/app/actions.ts` |
| 2 Anwendung | Einloggen & Rollenprüfung | Auth | `src/lib/auth.ts` |
| 2 Anwendung | Registrierung (geplant P4) | Supabase Auth | – |
| 3 Services | Zu-/Absagen & Anwesenheit | AttendanceService | `src/services/attendanceService.ts` |
| 3 Services | Strafen vorschlagen & freigeben | PenaltyEngine | `src/services/penaltyEngine.ts` |
| 3 Services | Protokollierung | AuditService | `src/services/auditService.ts` |
| 3 Services | Zahlungen verbuchen (geplant P4) | – | – |
| 4 Fachlogik | Regelverwaltung | Penalties | `src/domain/penalties.ts` |
| 5 Datenzugriff | Datenbankzugriff | Prisma Client | `src/lib/db.ts` |
| – | Datenbank | PostgreSQL (Supabase) | `prisma/schema.prisma` |

Die fünf Schichten sind dieselben wie auf der Folie „Schichtenarchitektur“ und in der [Architekturbegründung](architekturbegruendung.md).

## Fachklassen und Tabellen (Klassendiagramm, ER-Modell, Prisma)

| Bedeutung | Klasse (Klassendiagramm, Prisma-Modell) | Tabelle (ER-Modell) |
| --- | --- | --- |
| Person im Team (Trainer, Kassenwart, Spieler) | `User` | `USER` |
| Training | `TrainingSession` | `TRAINING_SESSION` |
| Rückmeldung bzw. Anwesenheit | `Attendance` | `ATTENDANCE` |
| Position im Strafenkatalog | `PenaltyRule` | `PENALTY_RULE` |
| Strafe eines Spielers | `PenaltyEntry` | `PENALTY_ENTRY` |
| Protokolleintrag (Audit-Log) | `AuditLog` | `AUDIT_LOG` |

Die Tabellennamen im ER-Modell sind die Prisma-Modellnamen in Großbuchstaben mit Unterstrich. Beziehungsnamen sind in Klassendiagramm und ER-Modell gleich: *meldet, hat, erstellt, schuldet, legt an, Grundlage, Anlass, Verlauf, Akteur*.

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
