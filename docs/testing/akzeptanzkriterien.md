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

## REQ-PEN-03 Überfällige Strafen und Mahngebühr (P4 markiert, seit 12.11.2026 automatisch gebucht)

**Given** freigegebene Strafe, Frist (7 Tage ab Freigabe) abgelaufen, noch nicht (voll) bezahlt
**Then** markiert die Kasse sie als überfällig und bucht für jede angefangene Woche genau eine Mahngebühr (Betrag aus der Katalogregel „Zahlungsverzug“, 5 €) als eigene offene Forderung; im Protokoll steht „automatisch“

**When** die Kasse erneut geöffnet wird (auch gleichzeitig von zwei Personen)
**Then** entsteht keine doppelte Mahngebühr (eindeutig je Strafe und Woche)

**When** der Kassenwart eine Mahngebühr erlässt oder die Strafe storniert wird
**Then** ist die Gebühr storniert und wird nicht erneut gebucht (getestet in `tests/features.db.test.ts`)

## REQ-SEC-01 Teams, Team-Code und Rechte (seit 12.11.2026)

**AK7 Given** ein neues Konto ohne Team
**When** es ein Team gründet
**Then** ist es Trainer dieses Teams, das Team hat einen 6-stelligen Team-Code und den Strafenkatalog als Vorlage

**When** ein anderes Konto den Team-Code eingibt (Groß-/Kleinschreibung, Leerzeichen egal)
**Then** ist es Spieler in diesem Team; den Code des Demo-Teams kann niemand verwenden

**AK8 Given** zwei Teams
**Then** sieht und ändert jedes Mitglied nur Termine, Forderungen, Kasse, Protokoll und Mitglieder des eigenen Teams

**AK9 Given** die Rechte-Tabelle (`src/domain/permissions.ts`)
**Then** darf nur der Kassenwart Zahlungen verbuchen, nur der Trainer Strafen freigeben und Rollen vergeben, und das Team behält immer mindestens einen Trainer (getestet in `tests/features.test.ts` und `tests/features.db.test.ts`)

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

## Testergebnisse Sprint „Features & Design“ (12.11.2026)

Lauf am 12.11.2026 gegen eine lokale, leere PostgreSQL-16-Testdatenbank: `RUN_DB_TESTS=1 npm test` **103 von 103 bestanden**; `npm test` ohne Datenbank 82 bestanden, 21 übersprungen; Lint, Formatierung, Typen und `npm run build` ohne Fehler.

| Ebene | Datei | Tests | Ergebnis |
|---|---|---|---|
| Unit | tests/penalties.test.ts (REQ-PEN-02, REQ-PEN-03) | 9 | bestanden |
| Unit | tests/strafenkatalog.test.ts (REQ-PEN-01, Pos. 9 Spiel, Zahlungsverzug) | 14 | bestanden |
| Unit | tests/payments.test.ts (REQ-PEN-04, AK4, Überfällige) | 19 | bestanden |
| Unit | tests/registration.test.ts (Registrierung, Startseite je Konto, Uhrzeit) | 16 | bestanden |
| Unit | tests/features.test.ts (Rechte AK9, Team-Code, Testkonten, manuelle Strafe, Mahngebühr-Wochen, Kassenstand, PayPal-Link, Beteiligung, Spielplan-Import) | 24 | bestanden |
| Komponente (mit DB) | tests/penaltyFlow.db.test.ts (AK1–AK3, AK5) | 4 | bestanden |
| Komponente (mit DB) | tests/p4Flow.db.test.ts (MVP-1, MVP-4, MVP-5, MVP-6/AK6, Registrierung) | 6 | bestanden |
| Komponente (mit DB) | tests/features.db.test.ts (AK7, AK8, Rollen, Stellvertreter, Spiel-Strafe Pos. 9, manuelle Strafe, Mahngebühr, Kassenbuch, Beiträge, Umfrage, Import, Demo-Team gesperrt) | 10 | bestanden |
| Komponente (mit DB) | tests/auditLogSchutz.db.test.ts (REQ-AUD-01, Regressionstest D-01) | 1 | bestanden |
| **Summe** | | **103** | **103 bestanden** |

Seit dem Ausbau der Demo-Anmeldung (12.11.2026) entfallen die zwei Tests der signierten Demo-Cookies (vorher 105). Zusätzlich wurden alle Seiten für Trainer, Kassenwart und Spieler in der Handy-Ansicht (iPhone 13, Playwright) auf einem lokalen Produktions-Build aufgerufen: keine Fehlerseite, keine Fehler in der Browser-Konsole.

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
| D-01 ([#56](https://github.com/squadhq-team/squadhq-team/issues/56)) | 10.11.2026 beim Testlauf P4 | Bei `RUN_DB_TESTS=1 npm test` wurden die Datenbank-Tests sporadisch rot. Nachgestellt am 12.11.2026: 6 von 100 Läufen rot, mit zwei Fehlerbildern: (a) `ERROR: tuple concurrently updated` im Setup (1×), (b) AK5 in `tests/penaltyFlow.db.test.ts`: ein Protokolleintrag ließ sich ändern (5×). Ursache: Vitest startet die DB-Testdateien parallel, und jede spielte in `beforeAll` den Audit-Log-Schutz (`applyAuditLogSchutz`) selbst ein. Die SQL-Anweisungen liefen einzeln ohne Transaktion: Zwei gleichzeitige `CREATE OR REPLACE FUNCTION` stoßen zusammen (a), und zwischen `DROP TRIGGER` und `CREATE TRIGGER` war das Audit-Log kurz ohne Trigger, sodass eine Änderung aus der anderen Testdatei durchkam (b). Fehlerbild (b) hätte theoretisch auch `npm run db:audit-schutz` auf der echten Datenbank betroffen (Bruchteile einer Sekunde während des Einspielens). | gering (sporadisch; in der App nur während des Einspielens möglich) | **behoben am 12.11.2026**, siehe „Behebung und Nachweis D-01“ unten. |

### Behebung und Nachweis D-01 (12.11.2026)

**Behebung**

| Änderung | Datei | Wirkung |
|---|---|---|
| Alle Anweisungen des Audit-Log-Schutzes laufen in **einer Transaktion**, vorher eine Sperre `pg_advisory_xact_lock` | `prisma/auditLogSchutz.ts` | Andere Verbindungen sehen entweder den alten oder den neuen Schutz, nie einen Zustand ohne Trigger (behebt b). Gleichzeitige Aufrufe laufen nacheinander (behebt a). Gilt auch für `npm run db:audit-schutz` auf der echten Datenbank. |
| Test-Datenbank wird **einmal vor allen Testdateien** vorbereitet (Audit-Log-Schutz, Katalogregel Pos. 8) | `tests/setup/dbGlobalSetup.ts`, `vitest.config.mts` (`globalSetup`) | Wie in der App wird der Schutz einmal eingespielt, nicht von jeder Testdatei parallel. Auch das gleichzeitige Anlegen der Katalogregel durch zwei Dateien auf einer leeren Datenbank (z. B. in der CI) entfällt. |
| Neuer **Regressionstest** | `tests/auditLogSchutz.db.test.ts` | Spielt den Schutz fünfmal gleichzeitig ein, während eine zweite Verbindung ununterbrochen versucht, einen Protokolleintrag zu ändern. Erwartet: kein Fehler, kein Änderungsversuch kommt durch. |

**Nachweis** (lokale PostgreSQL-16-Testdatenbank, nicht die Live-Datenbank)

| Lauf | Code-Stand | Ergebnis |
|---|---|---|
| `RUN_DB_TESTS=1 npm test`, 100× hintereinander | vor der Behebung (`a5cfd82`) | **6 von 100 rot** (Fehler nachgestellt) |
| Regressionstest `tests/auditLogSchutz.db.test.ts`, 20× | alter `applyAuditLogSchutz`, neuer Test | **20 von 20 rot** (`tuple concurrently updated`): Der Test erkennt den Defekt zuverlässig |
| `RUN_DB_TESTS=1 npm test`, 200× hintereinander, bestehende Test-DB | nach der Behebung | **200 von 200 grün** (je 70 Tests) |
| `RUN_DB_TESTS=1 npm test`, 50×, jedes Mal frisch angelegte leere Test-DB (wie in der CI) | nach der Behebung | **50 von 50 grün** (je 70 Tests) |
| `npm test` ohne Datenbank | nach der Behebung | 59 bestanden, 11 übersprungen |
| `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run db:audit-schutz` | nach der Behebung | ohne Fehler |

Die Umgehung `--no-file-parallelism` wird nicht mehr gebraucht; die Tests laufen weiter parallel.

**Teststand nach der Behebung**

| Ebene | Datei | Tests | Ergebnis |
|---|---|---|---|
| Unit | tests/penalties.test.ts (REQ-PEN-02, REQ-PEN-03) | 9 | bestanden |
| Unit | tests/strafenkatalog.test.ts (REQ-PEN-01) | 12 | bestanden |
| Unit | tests/payments.test.ts (REQ-PEN-04, AK4, Überfällige) | 19 | bestanden |
| Unit | tests/registration.test.ts (REQ-SEC-01, Registrierung, Uhrzeit) | 19 | bestanden |
| Komponente (mit DB) | tests/penaltyFlow.db.test.ts (AK1–AK3, AK5) | 4 | bestanden |
| Komponente (mit DB) | tests/p4Flow.db.test.ts (MVP-1, MVP-4, MVP-5, MVP-6/AK6, Registrierung) | 6 | bestanden |
| Komponente (mit DB) | tests/auditLogSchutz.db.test.ts (REQ-AUD-01, Regressionstest D-01) | 1 | bestanden |
| **Summe** | | **70** | **70 bestanden** |
