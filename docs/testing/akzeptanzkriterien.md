# Akzeptanzkriterien und Teststrategie

## Beispiel: REQ-PEN-02 Automatisierte Kassenverbuchung

**Given** Training beendet, Spieler X ohne Entschuldigung
**When** Trainer setzt UNEXCUSED_ABSENT
**Then** Entwurf (PENDING_APPROVAL) über 20,00 € gemäß TSVK-Katalog Pos. 8

**When** Trainer klickt „Freigeben“
**Then** Status OPEN, Saldo des Spielers +20,00 €, offene Forderung im Kassenwart-Dashboard

**When** Status nachträglich auf EXCUSED
**Then** Entwurf verworfen bzw. freigegebene Strafe im Audit-Log als storniert markiert

## REQ-PEN-04 Zahlungsverfolgung durch den Kassenwart (umgesetzt P4)

**AK4 Given** freigegebene Strafe über 20,00 € (Status OPEN)
**When** Kassenwart klickt „bezahlt (bar)“ bzw. „bezahlt (PayPal)“
**Then** Status PAID_CASH bzw. PAID_PAYPAL, Zahlungsart gespeichert, Saldo des Spielers −20,00 €

**When** Kassenwart gibt einen kleineren Betrag ein (Teilzahlung)
**Then** Status PARTIAL, offener Rest sinkt; der Rest kann später bar oder per PayPal verbucht werden

**When** ein Spieler oder Trainer versucht, eine Strafe als bezahlt zu setzen
**Then** wird das abgelehnt (nur Kassenwart, REQ-SEC-01; der Trainer sieht die Teamkasse ohne Buttons)

Getestet in `tests/payments.test.ts` und `tests/p4Flow.db.test.ts`.

## REQ-PEN-03 Überfällige Strafen (umgesetzt P4)

**Given** freigegebene Strafe, Frist (7 Tage ab Freigabe) abgelaufen, noch nicht (voll) bezahlt
**Then** markiert die Kassenwart-Ansicht sie als überfällig mit der Zahl angefangener Wochen und der Mahngebühr laut Katalog (5 € je Woche), bucht die Gebühr aber noch nicht

## REQ-AUD-01 Lückenloses Audit-Log

**AK5 Given** eine Strafe durchläuft Vorschlag, Freigabe und Zahlung
**Then** enthält ihr Protokoll je Schritt einen Eintrag mit altem und neuem Status, Bearbeiter und Zeitstempel

**When** jemand versucht, einen Protokolleintrag zu ändern oder zu löschen, auch direkt per SQL oder über das Löschen der Strafe
**Then** lehnt die Datenbank das ab (umgesetzt, getestet in `tests/penaltyFlow.db.test.ts`; Zahlungen werden seit P4 ebenfalls protokolliert)

**AK6 Given** ein vergangenes Training
**When** der Trainer die Anwesenheit eines Spielers setzt oder ändert
**Then** entsteht ein Protokolleintrag mit altem und neuem Status, Trainer und Zeitstempel; klickt er denselben Status erneut, entsteht kein weiterer Eintrag. Normale Rückmeldungen der Spieler (Dabei/Fehle/Unsicher) werden nicht protokolliert (getestet in `tests/p4Flow.db.test.ts`)

## Teststrategie
- Unit-Tests für PenaltyEngine (Regelprüfung, Beträge)
- Unit-Test des Strafenkatalogs gegen den TSVK-Katalog 2026/27 (REQ-PEN-01, `tests/strafenkatalog.test.ts`)
- Integrationstests für Rechte je Rolle (REQ-SEC-01)
- End-to-End-Tests für 1-Klick-Zu-/Absage (REQ-ATT-01)

## Testergebnisse

Alle Läufe am 10.11.2026 gegen eine lokale, leere PostgreSQL-16-Testdatenbank (nicht die Live-Datenbank). Ausführen: `npm test` (ohne Datenbank) bzw. `RUN_DB_TESTS=1 npm test` (mit Datenbank-Tests, braucht eine Test-DB in `DATABASE_URL`).

### Testergebnisse P3

Bei P3 wurden die Testläufe nicht schriftlich festgehalten. Deshalb wurden die damaligen Code-Stände am 10.11.2026 erneut ausgecheckt und die Tests darauf ausgeführt.

**P3-Prototyp (PR #31, 27.10.2026, Commit `bb2f8c9`)**

| Ebene | Datei | Tests | Ergebnis |
|---|---|---|---|
| Unit | tests/penalties.test.ts | 9 | bestanden |
| Komponente (mit DB) | tests/penaltyFlow.db.test.ts (AK1–AK3) | 3 | bestanden |
| **Summe** | | **12** | **12 bestanden** |

**Stand der P3-Präsentation (03.11.2026, Commit `fe95f68`)**

| Ebene | Datei | Tests | Ergebnis |
|---|---|---|---|
| Unit | tests/penalties.test.ts | 9 | bestanden |
| Unit | tests/strafenkatalog.test.ts (REQ-PEN-01) | 12 | bestanden |
| Komponente (mit DB) | tests/penaltyFlow.db.test.ts (AK1–AK3, AK5) | 4 | bestanden |
| **Summe** | | **25** | **25 bestanden** |

Ein manueller Akzeptanztest wurde zu P3 nicht protokolliert. Er ist für den aktuellen Stand unten nachgeholt.

Gefundene Defekte P3: keine.

### Testergebnisse P4 (10.11.2026, Commit `aa2865c`)

**Automatisierte Tests**

| Ebene | Datei | Tests | Ergebnis |
|---|---|---|---|
| Unit | tests/penalties.test.ts (REQ-PEN-02, REQ-PEN-03) | 9 | bestanden |
| Unit | tests/strafenkatalog.test.ts (REQ-PEN-01) | 12 | bestanden |
| Unit | tests/payments.test.ts (REQ-PEN-04, AK4, Überfällige) | 19 | bestanden |
| Unit | tests/registration.test.ts (REQ-SEC-01, Registrierung, Uhrzeit) | 12 | bestanden |
| Komponente (mit DB) | tests/penaltyFlow.db.test.ts (AK1–AK3, AK5) | 4 | bestanden |
| Komponente (mit DB) | tests/p4Flow.db.test.ts (MVP-1, MVP-4, MVP-5, MVP-6/AK6, Registrierung) | 6 | bestanden |
| **Summe** | | **62** | **62 bestanden** (siehe Defekt D-01) |

Zusätzlich lief die CI (Lint, Format, Typen, alle 62 Tests mit Datenbank, Build) beim Push von `aa2865c` am 09.11.2026 grün: [CI-Lauf #1](https://github.com/squadhq-team/squadhq-team/actions/runs/42627902152).

**Akzeptanztest nach [Demo-Ablauf](../demo-ablauf.md)**

Durchgeführt am 10.11.2026 auf einem lokalen Produktions-Build (`npm run build`, `npm start`) mit frisch geladenen Demo-Daten (`prisma db seed`). Die Klicks wurden per Browser-Automatisierung (Playwright, Chromium) ausgeführt und das Ergebnis jeweils auf der Seite geprüft. Bewusst nicht auf der Live-App, damit die Demo-Daten für P4 unverändert bleiben.

| Schritt | Geprüft | Anforderung | Ergebnis |
|---|---|---|---|
| 1 | Registrieren mit Name, E-Mail, Passwort → landet als Spieler in „Mein Bereich“; danach Anmelden mit E-Mail und Passwort | REQ-SEC-01 | bestanden |
| 1 | Spieler ruft `/kasse` auf → wird umgeleitet | REQ-SEC-01 | bestanden |
| 2 | Tim Wagner: Grund „Arbeit“ eintragen, 1 Klick „Fehle entschuldigt“ | REQ-ATT-01 | bestanden |
| 3 | Trainer Jan Petersen legt ein Training an (18.11., 19:30), es erscheint im Dashboard und bei den Spielern | MVP-1 | bestanden |
| 4 | Vergangenes Training (09.11.) öffnen: Rückmeldungen sichtbar, Noah ohne Antwort | REQ-ATT-02 | bestanden |
| 5 | Noah „Unentschuldigt“ → Vorschlag „TSVK Pos. 8 … 20,00 €“; „Freigeben“ → Vorschlag verschwindet | REQ-PEN-02, AK1, AK2 | bestanden |
| 5 | Trainer sieht die Teamkasse ohne Buttons zum Verbuchen | REQ-SEC-01 | bestanden |
| 6 | Kassenwart Karl Brandt: Teamkasse zeigt offen, eingenommen, überfällig; Paul ist überfällig | MVP-4 | bestanden |
| 7 | Bei Noah „Bezahlt (bar)“ → Noah steht unter „Bezahlte Strafen“ | MVP-5, AK4 | bestanden |
| 7 | Bei Paul Teilzahlung 10 € bar | MVP-5 | bestanden |
| 8 | Protokoll zeigt Teilzahlung, Zahlung, Freigabe, Vorschlag und Anwesenheit mit Zeit und Bearbeiter | MVP-6, AK5, AK6 | bestanden |
| 9 | Noahs Kassenkonto steht wieder auf 0,00 € | REQ-PEN-03 | bestanden |

### Gefundene Defekte

| Nr. | Gefunden | Beschreibung | Schwere | Status |
|---|---|---|---|---|
| D-01 | 10.11.2026 beim Testlauf P4 | Bei `RUN_DB_TESTS=1 npm test` schlug `tests/penaltyFlow.db.test.ts` in 1 von 27 Läufen im Setup fehl (`ERROR: tuple concurrently updated`). Ursache: Vitest startet beide DB-Testdateien parallel, und beide spielen gleichzeitig den Audit-Log-Schutz ein (`applyAuditLogSchutz`, `CREATE OR REPLACE FUNCTION …`). Betrifft nur die Tests, nicht die App: In der App wird der Schutz einmal per `npm run db:audit-schutz` eingespielt. | gering (sporadisch, nur Testumgebung) | offen. Umgehung: Testdateien nacheinander ausführen mit `RUN_DB_TESTS=1 npx vitest run --no-file-parallelism` (3 von 3 Läufen grün). Behebung nach P4 (Feature-Stopp bis P4). |
