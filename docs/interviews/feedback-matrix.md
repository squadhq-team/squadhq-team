# Feedback-Matrix

Strukturierte 1-zu-1-Interviews, TSV Kronshagen 1. Herren. Dazu Artefakt-Analyse des TSVK-Strafenkatalogs 2026/27.

| Quelle | Feedback | Konsequenz | REQ |
|---|---|---|---|
| Trainer | Unentschuldigten Fehltermin erst bestätigen, bevor automatisch eine Strafe eingetragen wird | Bestätigungsschritt (PENDING_APPROVAL) im Dashboard | REQ-PEN-02 |
| Kassenwart | Änderungen müssen nachvollziehbar sein: wer hat eine Strafe eingetragen, geändert oder storniert | Audit-Log je Strafe | REQ-AUD-01, REQ-PEN-02 |
| Kassenwart | Meist Barzahlung nach dem Training, teils PayPal; Status offen, teilweise bezahlt, bezahlt | Zahlungsstatus OPEN, PARTIAL, PAID_CASH, PAID_PAYPAL | REQ-PEN-04, REQ-PEN-03 |
| Spieler | Hemmschwelle beim Absagen, Formulieren fällt schwer | 1-Klick-Rückmeldung mit optionalem Grund | REQ-ATT-01 |
| Trainer | In der WhatsApp-Gruppe sieht er nicht, wer kommt, und erfährt Absagen zu spät (sinngemäß, siehe Hinweis unten) | Trainer-Dashboard mit Anwesenheitsliste und Rückmeldefrist vor dem Training | REQ-ATT-02 |
| Trainer | Nur der Kassenwart soll Zahlungen eintragen dürfen (sinngemäß, siehe Hinweis unten) | Rollen Trainer, Kassenwart, Spieler mit eigenen Rechten; nur der Kassenwart verbucht Zahlungen | REQ-SEC-01, REQ-PEN-04 |
| Artefakt-Analyse | TSVK-Strafenkatalog 2026/27: unentschuldigtes Fehlen beim Training kostet 20 € (Pos. 8), Zahlungsfrist und Verzugsregel 5 € je Woche | Katalog vollständig als Daten (PenaltyRule), Frist 7 Tage ab Freigabe | REQ-PEN-01, REQ-PEN-03 |

Von jeder Zeile führt die Spalte `REQ` in die [Traceability-Matrix](../traceability.md) (Entwurf, Code, Test).

### Prüfung der Zuordnung (10.11.2026)

- Die ursprüngliche Zuordnung stammt aus P3 (vor den finalen MVPs vom 03.11.2026). Seitdem ist das Audit-Log eine eigene Anforderung (REQ-AUD-01) und das Verbuchen von Zahlungen ebenfalls (REQ-PEN-04, siehe [Features und MVPs](../anforderungen/features-und-mvps.md)). Deshalb zeigt die Kassenwart-Zeile „nachvollziehbar“ jetzt auf REQ-AUD-01 (und REQ-PEN-02, weil Freigabe, Verwerfen und Storno dort protokolliert werden) und die Zeile „Barzahlung, PayPal“ auf REQ-PEN-04 (Verbuchen) und REQ-PEN-03 (Übersicht offen/bezahlt).
- Die Zeile „Artefakt-Analyse“ ist neu: Der Katalog war schon in P3 Quelle von REQ-PEN-01 (siehe Einleitung oben), stand aber nicht in der Tabelle.
- Die beiden Trainer-Zeilen zu REQ-ATT-02 und REQ-SEC-01 fehlten bisher, obwohl die Traceability-Matrix sie als Quelle nennt. Sie sind am 10.11.2026 nach der Erinnerung von Kirill Korsun an das Trainer-Interview ergänzt. Schriftliche Interview-Notizen dazu liegen nicht vor, deshalb sind die Aussagen sinngemäß und kein wörtliches Zitat.

## Abgeleitete Must-Haves
REQ-SEC-01, REQ-ATT-01, REQ-ATT-02, REQ-PEN-01, REQ-PEN-02, REQ-PEN-03, REQ-PEN-04, REQ-AUD-01

Seit 03.11.2026 gelten die 6 finalen MVPs, siehe [Features und MVPs](../anforderungen/features-und-mvps.md). Neu als Must-Have: REQ-PEN-04 Zahlungsverfolgung durch den Kassenwart (bisher Teil von REQ-PEN-03) und REQ-AUD-01 Audit-Log (in P2 noch Should).
