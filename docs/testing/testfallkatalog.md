# Testfallkatalog SquadHQ

Stand 23.11.2026. Alle Testfälle sind automatisiert, laufen bei jedem Pull Request in der CI und lassen sich jederzeit
mit demselben Ergebnis wiederholen. Ergebnisse der Läufe: [akzeptanzkriterien.md](akzeptanzkriterien.md#testergebnisse-p5-23112026).

## Drei Ebenen

| Ebene | Was wird geprüft | Werkzeug | Dateien | Anzahl | Starten |
|---|---|---|---|---|---|
| 1 Unit | einzelne Fachregeln als reine Funktionen, ohne Datenbank und Browser | Vitest | `tests/*.test.ts` | 112 | `npm test` |
| 2 Komponente | ein ganzer Ablauf über die Services gegen eine echte, leere PostgreSQL-Datenbank (inkl. Audit-Log-Trigger und Prüfregeln) | Vitest | `tests/*.db.test.ts` | 31 | `RUN_DB_TESTS=1 npm test` |
| 3 Akzeptanz | Kernabläufe aus Sicht von Trainer, Spieler und Kassenwart im echten Browser (Handy-Ansicht) gegen die gebaute App | Playwright | `tests/e2e/akzeptanz.spec.ts` | 13 | `npm run test:e2e` |

**Wiederholbarkeit:** Jeder Lauf beginnt mit demselben Ausgangszustand. Unit-Tests haben keinen Zustand. Komponententests
legen ihr eigenes Team mit zufälligem Namen an (`tests/helpers/testTeam.ts`). Vor den Akzeptanztests wird die
Test-Datenbank komplett geleert und neu aufgebaut (`tests/e2e/globalSetup.ts`). Die Anmeldung läuft dort über eine
Attrappe von Supabase Auth (`tests/e2e/supabaseAttrappe.ts`), damit keine echten Konten, keine Mails und kein Internet
nötig sind. Uhrzeiten werden nicht abgewartet: „Das Training ist vorbei“ stellt der Test her, indem er den Beginn in der
Datenbank in die Vergangenheit legt.

**Test-Orakel:** Das erwartete Ergebnis steht fest im Test (`expect(...)`), abgeleitet aus der Anforderung bzw. dem
Akzeptanzkriterium, nicht aus dem Programm. Beispiele: Beträge aus dem TSVK-Strafenkatalog 2026/27 (Pos. 8 = 20,00 €),
Fristen aus den P4-Entscheidungen (7 Tage, 5 € je Woche), Texte der Oberfläche.

## Ebene 3: Akzeptanztests

Ausgangslage: leere Datenbank, App gebaut wie auf Vercel (`npm run build`), Browser Chromium in Handy-Größe (iPhone 13),
Sprache Deutsch, Zeitzone Berlin. Die Testfälle bauen aufeinander auf und laufen in dieser Reihenfolge.

| ID | Anforderung | Eingabe / Aktion | Erwartetes Ergebnis (Orakel) |
|---|---|---|---|
| AT-01 | AK7, REQ-SEC-01 | Tina registriert sich (Name, E-Mail, Passwort), gründet „SV Akzeptanz 1. Herren“ | Landet auf „Wie geht es los?“, danach Teamname im Kopf; Team-Seite zeigt einen 6-stelligen Code aus Großbuchstaben/Ziffern und „Trainer (1)“ |
| AT-02 | AK7 | Sam, Pia und Kai registrieren sich mit dem Team-Code in Kleinbuchstaben und mit Leerzeichen | Alle drei landen direkt auf ihrer Startseite („Hallo Sam“ …) im Team; Trainer sieht „Spieler (3)“ |
| AT-03 | REQ-SEC-01 (#20) | Trainer: Team → Kai → Verwalten → „Kassenwart“ | Meldung „Rolle geändert.“, Abschnitte „Kassenwart (1)“ und „Spieler (2)“ |
| AT-04 | MVP-1, REQ-ATT-01 | Trainer legt „Dienstagstraining“ und „Donnerstagstraining“ in 3 Tagen um 19:00 an; Sam tippt beim Dienstagstraining „Dabei“, Pia beim Donnerstagstraining | Meldung „Termin angelegt.“; Button „Dabei“ ist danach gewählt (`aria-pressed=true`), Zähler „1 dabei“ |
| AT-05 | MVP-2, MVP-3, AK1, AK2 | Dienstagstraining ist vorbei; Trainer setzt Sam auf „Unentsch.“ und klickt „Freigeben“ | Vorschlag „Pos. 8: Unentschuldigtes Fehlen beim Training“ für Sam über 20,00 €; nach Freigabe kein Vorschlag mehr, Kasse zeigt Sam mit 20,00 € offen |
| AT-06 | AK9 | Trainer öffnet die Kasse; Sam öffnet `/protokoll` und `/kasse` | Trainer sieht offene Forderungen, aber keinen Button „Bezahlt (bar)“; Sam wird auf `/start` umgeleitet und sieht in der Kasse nur „Mein Kassenkonto“ |
| AT-07 | #54 | Kai trägt bei „PayPal“ `paypal.me/svakzeptanz` ein; Sam öffnet seine Kasse | Link „Per PayPal zahlen (20,00 €)“ mit Ziel `https://paypal.me/svakzeptanz/20.00EUR` |
| AT-08 | MVP-4, MVP-5, AK4 | Kai klickt bei Sams Strafe „Bezahlt (bar)“ | Kasse: „Keine offenen Strafen oder Beiträge.“; Sam: „Alles bezahlt. Danke!“, Strafe mit Status „Bezahlt (bar)“ |
| AT-09 | MVP-6, AK5, AK6 | Kai öffnet das Protokoll | Neueste zuerst: „Bezahlt verbucht“ (Offen → Bezahlt (bar) · von Kai Kasse), „Strafe freigegeben“, „Strafe vorgeschlagen“, „Anwesenheit gesetzt“ (Dabei → Unentschuldigt · von Tina Trainer); dazu „Rolle geändert“ (Spieler → Kassenwart) |
| AT-10 | AK10, AK11 | Donnerstagstraining ist vorbei; Trainer gibt Pia die Notiz „Gutes Passspiel, Kopfball üben“ und 4 Sterne; Pia und Sam öffnen Pias Leistungsseite | Beim Trainer leuchten 4 Sterne, Notiz bleibt stehen, „Entfernen“ erscheint; Pia sieht „Meine Leistung“ mit Notiz; Sam wird auf die Statistik-Übersicht umgeleitet und sieht die Notiz nicht |
| AT-11 | AK8 | Fritz registriert sich ohne Code und gründet „FC Nebenan“ | Fritz sieht weder das Dienstagstraining noch Sam in der Kasse noch Tina im Team |
| AT-12 | Regressionstest D-03 | Franzi registriert sich mit dem Code `QQ00QQ` (gibt es nicht), danach mit dem richtigen Code | Bleibt auf `/registrieren` mit Hinweis „Diesen Team-Code gibt es nicht …“, es wird kein Konto angelegt; mit richtigem Code klappt es mit derselben E-Mail |
| AT-13 | Regressionstest D-02 | Fritz öffnet die Team-Seite seines Teams mit 1 Mitglied | Text „FC Nebenan · 1 Mitglied“ |

## Ebene 2: Komponententests (mit Datenbank)

| ID | Datei | Anforderung | Eingabe / Aktion (Beispiele) | Erwartetes Ergebnis (Beispiele) | Tests |
|---|---|---|---|---|---|
| KT-01 | `penaltyFlow.db.test.ts` | REQ-PEN-02, AK1–AK3, AK5 | Trainer setzt einen Spieler bei einem vergangenen Training auf UNEXCUSED, gibt frei, setzt dann EXCUSED; versucht per SQL einen Protokolleintrag zu ändern | genau ein Entwurf über 2000 Cent; nach Freigabe OPEN mit Fälligkeit; danach storniert und protokolliert; die Datenbank lehnt Änderung und Löschen ab | 4 |
| KT-02 | `p4Flow.db.test.ts` | MVP-1, MVP-4, MVP-5, MVP-6, AK4, AK6 | Training anlegen ohne Frist; Teilzahlung 5 € bar, Rest per PayPal; Anwesenheit zweimal gleich setzen | Frist = 3 Stunden vor Beginn; Status PARTIAL, dann PAID_PAYPAL, jeder Schritt im Protokoll; gleicher Klick erzeugt keinen zweiten Eintrag | 6 |
| KT-03 | `features.db.test.ts` | AK7, AK8, AK9, #46, #47, #50, #52, #53, D-03 | Team gründen, per Code beitreten, zweites Team; Spiel unentschuldigt; Strafe 10 Tage über der Frist, Mahnlauf zweimal gleichzeitig; falscher Team-Code | Gründer = Trainer mit 17 Katalogregeln; kein Zugriff aufs fremde Team; Pos. 9 = 40 €; genau 2 Mahngebühren je 5 € (Woche 1 und 2), keine doppelt; falscher Code und Demo-Team-Code ergeben kein Team | 11 |
| KT-04 | `statistics.db.test.ts` | AK10–AK12 | Trainer bewertet Anwesende, Spieler versucht zu bewerten, Sterne = 6 direkt per SQL | Bewertung gespeichert bzw. überschrieben; Spieler wird abgelehnt; Datenbank lehnt 6 Sterne ab; letzter Punkt im Kassenverlauf = Kassenstand | 6 |
| KT-05 | `erinnerungen.db.test.ts` | #26 | Training mit Mitgliedern mit und ohne Rückmeldung, eines mit abgeschalteter Erinnerung, ein Kind mit Stellvertreter; Mailserver als Attrappe | Mail nur an Spieler ohne Antwort und an den Stellvertreter („von … Kind“), mit Link zum Termin; fehlgeschlagene Mail wird gezählt, der Job bricht nicht ab | 3 |
| KT-06 | `auditLogSchutz.db.test.ts` | REQ-AUD-01, Regressionstest D-01 | Schutz fünfmal gleichzeitig einspielen, eine zweite Verbindung versucht dauernd, einen Eintrag zu ändern | kein Fehler, kein Änderungsversuch kommt durch | 1 |

## Ebene 1: Unit-Tests

| ID | Datei | Anforderung | Eingabe (Beispiele) | Erwartetes Ergebnis (Beispiele) | Tests |
|---|---|---|---|---|---|
| UT-01 | `penalties.test.ts` | REQ-PEN-02, REQ-PEN-03 | Anwesenheit UNEXCUSED mit Katalog; Strafen mit Status PENDING_APPROVAL, PAID_CASH, PARTIAL | Vorschlag Pos. 8 über 2000 Cent; Saldo zählt Vorschläge und bezahlte nicht, bei Teilzahlung nur den Rest; Fälligkeit = Freigabe + 7 Tage | 9 |
| UT-02 | `strafenkatalog.test.ts` | REQ-PEN-01, #47, #52, D-04 | TSVK-Katalog 2026/27 aus `prisma/strafenkatalog.ts`, absichtlich rückwärts sortiert | alle Positionen 1–13 mit Unterpositionen; Verspätung 2/5/10 €; Training → Pos. 8, Spiel → Pos. 9; Reihenfolge 3, 4, 5A, 5B, 6 … 13A–13C | 16 |
| UT-03 | `payments.test.ts` | REQ-PEN-04, AK4 | Strafe 2000 Cent; Zahlung bar, PayPal, Teilbetrag, 2500 Cent, 0, −100; Zahlung auf bezahlte Strafe; Eingabe „12,50“, „abc“ | bar/PayPal → ganz bezahlt; Teilbetrag → PARTIAL; zu hoch/leer/negativ → abgelehnt; bezahlte Strafe → „nicht offen“; „12,50“ → 1250 Cent, „abc“ ungültig | 19 |
| UT-04 | `registration.test.ts` | REQ-SEC-01 | Registrierung ohne Namen, mit „max“ als E-Mail, 7-stelliges Passwort; englische Supabase-Meldungen; „2026-11-14T19:30“ | jeweils deutsche Fehlermeldung; „Invalid login credentials“ → „E-Mail oder Passwort ist falsch.“; Winterzeit = UTC+1 | 16 |
| UT-05 | `features.test.ts` | REQ-SEC-01, AK9, #46, #52, #53, #54, #30, D-02 | Rechte-Tabelle je Rolle; Team-Code „ k7m-2qx “; PayPal-Eingabe „@kalle123“, Betrag 2050 Cent; Anzahl 0 bei manueller Strafe; Anzahl 1 Mitglied | nur Kassenwart verbucht, nur Trainer gibt frei; Code → „K7M2QX“; Name „kalle123“, Link `https://paypal.me/kalle123/20.50EUR`; Anzahl 0 abgelehnt; „1 Mitglied“ | 25 |
| UT-06 | `statistics.test.ts` | #65, AK10, AK11 | Sterne 0/6/3,5; Bewertungen über mehrere Wochen; Rollen Spieler/Elternteil | ungültige Sterne abgelehnt; Schnitt und Trend ab 4 Bewertungen; Spieler sieht nur die eigenen | 21 |
| UT-07 | `erinnerungen.test.ts` | #26 | Mitglieder mit und ohne Mail, abgeschaltet, Testkonto | Mail nur an die richtigen Adressen, je Adresse eine; Text nennt Termin, Frist, Link | 6 |

Gesamt: 112 Unit-Tests, 31 Komponententests, 13 Akzeptanztests (156).

## Weitere Prüfungen bei jedem Pull Request

ESLint (Codequalität, Schichtenregeln), Prettier (Formatierung), TypeScript (Typen) und `npm run build` (wie auf Vercel),
siehe [Coding-Guidelines, Abschnitt 9](../coding-guidelines.md#9-durchsetzung-so-werden-die-regeln-eingehalten).
Manuelle Prüfungen: Reviews und Inspektionen nach dem [Review-Protokoll](review-protokoll.md), Nutzertests nach dem
[Leitfaden](nutzertest/leitfaden.md).
