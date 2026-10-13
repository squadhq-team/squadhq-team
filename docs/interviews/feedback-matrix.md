# Feedback-Matrix

Strukturierte 1-zu-1-Interviews, TSV Kronshagen 1. Herren. Dazu Artefakt-Analyse des TSVK-Strafenkatalogs 2026/27.

| Quelle | Feedback | Konsequenz |
|---|---|---|
| Trainer | Unentschuldigten Fehltermin erst bestätigen, bevor automatisch eine Strafe eingetragen wird | Bestätigungsschritt (PENDING_APPROVAL) im Dashboard |
| Kassenwart | Änderungen müssen nachvollziehbar sein: wer hat eine Strafe eingetragen, geändert oder storniert | Audit-Log je Strafe |
| Kassenwart | Meist Barzahlung nach dem Training, teils PayPal; Status offen, teilweise bezahlt, bezahlt | Zahlungsstatus OPEN, PARTIAL, PAID_CASH, PAID_PAYPAL |
| Spieler | Hemmschwelle beim Absagen, Formulieren fällt schwer | 1-Klick-Rückmeldung mit optionalem Grund |

## Abgeleitete Must-Haves
REQ-SEC-01, REQ-ATT-01, REQ-ATT-02, REQ-PEN-01, REQ-PEN-02, REQ-PEN-03
