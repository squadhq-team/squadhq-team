# Akzeptanzkriterien und Teststrategie

## Beispiel: REQ-PEN-02 Automatisierte Kassenverbuchung

**Given** Training beendet, Spieler X ohne Entschuldigung
**When** Trainer setzt UNEXCUSED_ABSENT
**Then** Entwurf (PENDING_APPROVAL) über 20,00 € gemäß TSVK-Katalog Pos. 8

**When** Trainer klickt „Freigeben“
**Then** Status OPEN, Saldo des Spielers +20,00 €, offene Forderung im Kassenwart-Dashboard

**When** Status nachträglich auf EXCUSED
**Then** Entwurf verworfen bzw. freigegebene Strafe im Audit-Log als storniert markiert

## REQ-PEN-04 Zahlungsverfolgung durch den Kassenwart (Entwurf für P4)

**AK4 Given** freigegebene Strafe über 20,00 € (Status OPEN)
**When** Kassenwart klickt „bezahlt (bar)“ bzw. „bezahlt (PayPal)“
**Then** Status PAID_CASH bzw. PAID_PAYPAL, Zahlungsart gespeichert, Saldo des Spielers −20,00 €

**When** ein Spieler oder Trainer versucht, eine Strafe als bezahlt zu setzen
**Then** wird das abgelehnt (nur Kassenwart, REQ-SEC-01)

## REQ-AUD-01 Lückenloses Audit-Log

**AK5 Given** eine Strafe durchläuft Vorschlag, Freigabe und Zahlung
**Then** enthält ihr Protokoll je Schritt einen Eintrag mit altem und neuem Status, Bearbeiter und Zeitstempel

**When** jemand versucht, einen Protokolleintrag zu ändern oder zu löschen, auch direkt per SQL oder über das Löschen der Strafe
**Then** lehnt die Datenbank das ab (umgesetzt, getestet in `tests/penaltyFlow.db.test.ts`; Protokoll der Zahlungen folgt mit REQ-PEN-04)

## Teststrategie
- Unit-Tests für PenaltyEngine (Regelprüfung, Beträge)
- Unit-Test des Strafenkatalogs gegen den TSVK-Katalog 2026/27 (REQ-PEN-01, `tests/strafenkatalog.test.ts`)
- Integrationstests für Rechte je Rolle (REQ-SEC-01)
- End-to-End-Tests für 1-Klick-Zu-/Absage (REQ-ATT-01)
