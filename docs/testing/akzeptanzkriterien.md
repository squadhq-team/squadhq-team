# Akzeptanzkriterien und Teststrategie

## Beispiel: REQ-PEN-02 Automatisierte Kassenverbuchung

**Given** Training beendet, Spieler X ohne Entschuldigung
**When** Trainer setzt UNEXCUSED_ABSENT
**Then** Entwurf (PENDING_APPROVAL) über 20,00 € gemäß TSVK-Katalog Pos. 8

**When** Trainer klickt „Freigeben“
**Then** Status OPEN, Saldo des Spielers +20,00 €, offene Forderung im Kassenwart-Dashboard

**When** Status nachträglich auf EXCUSED
**Then** Entwurf verworfen bzw. freigegebene Strafe im Audit-Log als storniert markiert

## Teststrategie
- Unit-Tests für PenaltyEngine (Regelprüfung, Beträge)
- Integrationstests für Rechte je Rolle (REQ-SEC-01)
- End-to-End-Tests für 1-Klick-Zu-/Absage (REQ-ATT-01)
