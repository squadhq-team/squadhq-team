# Finale Features und MVPs

> Stand 03.11.2026, vom Team festgelegt. SquadHQ orientiert sich am Funktionsumfang von **SpielerPlus**, zugeschnitten auf die TSV Kronshagen 1. Herren (Interviews siehe [Feedback-Matrix](../interviews/feedback-matrix.md), Strafen siehe [Strafenkatalog](strafenkatalog-tsvk-2026-27.md)). Umsetzungsstand je Anforderung siehe [Traceability](../traceability.md).

## Die 6 MVPs (Must-Haves)

| # | MVP | Beschreibung | Anforderung |
| --- | --- | --- | --- |
| MVP-1 | Terminplanung & 1-Klick-Zusage | Der Trainer erstellt Trainingseinheiten, die Spieler antworten mit einem Klick auf **Dabei**, **Fehle** oder **Unsicher**. | REQ-ATT-01 |
| MVP-2 | Trainer-Dashboard & Anwesenheitsliste | Übersichtliche Ansicht für den Trainer, wer am Training teilnimmt oder unentschuldigt fehlt. | REQ-ATT-02 |
| MVP-3 | Automatisierter Strafenvorschlag (Zwei-Stufen-Workflow) | Fehlt ein Spieler unentschuldigt, schlägt das System automatisch eine Strafe vor (20 € nach TSVK-Katalog Pos. 8), die der Trainer erst bestätigen muss. | REQ-PEN-01, REQ-PEN-02 |
| MVP-4 | Digitale Teamkasse | Zentrale Übersicht über alle offenen und bezahlten Strafen. | REQ-PEN-03 |
| MVP-5 | Zahlungsverfolgung durch den Kassenwart | Der Kassenwart setzt eine Strafe mit einem Klick auf **bezahlt (bar)** oder **bezahlt (PayPal)**. | REQ-PEN-04 |
| MVP-6 | Lückenloses Audit-Log | Jede Änderung am Status oder an Strafen wird manipulationssicher mit Zeitstempel und Bearbeiter protokolliert. | REQ-AUD-01 |

Querschnitt für alle MVPs: **REQ-SEC-01** Rollen Trainer, Kassenwart, Spieler (wer darf was).

Änderungen gegenüber P2: Das Audit-Log war in P2 ein Should-Have und ist jetzt MVP (REQ-AUD-01). Die Zahlungsverfolgung durch den Kassenwart war Teil von REQ-PEN-03 und ist jetzt eine eigene Anforderung (REQ-PEN-04). REQ-PEN-03 meint damit die Übersicht, REQ-PEN-04 das Verbuchen.

## Gesamtumfang (Features, angelehnt an SpielerPlus)

Die Liste beschreibt, wohin sich SquadHQ entwickeln soll. Was nicht in den MVPs steht, kommt nach dem MVP.

### 1. Terminplanung & Kalender
- **Echtzeit-Zu- und Absagen:** Teammitglieder nehmen Termine mit einem Fingertipp an oder sagen ab. *(MVP-1)*
- **Event-Typen:** Training, Spiel, Turnier, Mannschaftsfeier, sonstige Vereinsaktivität. *(MVP: nur Training)*
- **Zusatzinfos:** Aufstellungen, Aufgaben, Treffpunkt, Uhrzeit, Ort und Videos zu Terminen. *(MVP: Uhrzeit und Ort)*
- **Spielplan-Import:** automatischer Import offizieller Spielpläne (z. B. deutscher Fußball) in den Kalender.
- **Push-Benachrichtigungen:** automatische Erinnerungen und Hinweise bei kurzfristigen Termin- oder Planänderungen.

### 2. Kommunikation & Chat
- **Team-Chat:** zentraler Chatbereich statt unübersichtlicher WhatsApp-Verläufe.
- **Neuigkeiten & Ankündigungen:** wichtige Infos vom Trainer oder Betreuer an das ganze Team.
- **Umfragen:** schnelle Abstimmungen, z. B. für Mannschaftsfeiern oder Essensbestellungen.

### 3. Teamverwaltung & Rollen
- **Mitgliederübersicht:** Namen, Positionen, Kontaktdaten und Profile aller Teammitglieder.
- **Rollenkonzept:** Rollen mit eigenen Berechtigungen, z. B. Trainer, Betreuer, Kassenwart, Spieler. *(MVP: Trainer, Kassenwart, Spieler, REQ-SEC-01)*
- **Eltern-Accounts & Stellvertreter:** für Jugendteams eigener Login für Eltern oder Stellvertreter, die den Account des Kindes verwalten.

### 4. Digitale Teamkasse & Strafenkatalog
- **Umsatzübersicht:** alle Einnahmen und Ausgaben der Mannschaft auf einen Blick. *(MVP-4: offene und bezahlte Strafen)*
- **Strafenkatalog:** feste Regeln mit automatischen oder manuellen Strafen, z. B. für Zuspätkommen oder unentschuldigtes Fehlen. *(MVP-3: automatischer Vorschlag Pos. 8)*
- **Beitragsverwaltung:** teaminterne Beiträge und offene Salden nachverfolgen. *(MVP: offene Salden aus Strafen)*

## Abweichungen zur Priorisierung aus P2

| Thema | P2 (MoSCoW) | Jetzt |
| --- | --- | --- |
| Audit-Log | Should | Must (MVP-6) |
| Team-Chat | Won't | im Gesamtumfang, nicht im MVP |
| Push-Erinnerungen | Should | im Gesamtumfang, nicht im MVP |
| Rolle Betreuer, Eltern-Accounts | nicht geplant | im Gesamtumfang, nicht im MVP |

## Umsetzungsstand 12.11.2026 (Sprint „Features & Design“)

Für die vorgezogenen Nutzertests ist der Gesamtumfang umgesetzt (Details und Tests in der [Traceability](../traceability.md)):

- **Terminplanung:** alle Event-Typen, Treffpunkt, Aufgaben, Notizen, Gegner, Aufstellung (Start/Bank), Termine bearbeiten und absagen, Spielplan-Import als .ics-Datei (z. B. Export von fussball.de), Push-Benachrichtigungen bei neuen, geänderten und abgesagten Terminen sowie Erinnerung vor der Rückmeldefrist. Videos zu Terminen gibt es noch nicht.
- **Kommunikation:** Team-Chat, Ankündigungen (anheftbar), Umfragen mit Einfach- oder Mehrfachauswahl und Enddatum.
- **Teamverwaltung:** mehrere Teams mit Team-Code, Mitgliederübersicht mit Position und Rückennummer, Rollen Trainer, Betreuer, Kassenwart, Spieler, Elternteil/Stellvertreter, Mitglieder ohne eigenes Konto, Konto löschen.
- **Teamkasse:** manuelle Strafen aus dem Katalog, Katalog pflegen, automatische Mahngebühr, Beiträge, Einnahmen und Ausgaben mit Kassenstand, PayPal.me-Link, Beteiligungsstatistik.
