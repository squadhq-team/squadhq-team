# Strafenkatalog TSV Kronshagen 1. Herren, Saison 2026/27

> Quelle: offizieller Strafenkatalog des Teams (PDF, erstellt 28.07.2026), vom Team am 03.11.2026 bereitgestellt. Grundlage für REQ-PEN-01 und für die Demo-Daten in [`prisma/strafenkatalog.ts`](../../prisma/strafenkatalog.ts).

## Positionen

| Pos. | Vergehen | Betrag |
| --- | --- | --- |
| 1 | Rauchen und Alkohol im Trikot | 1 Kasten |
| 2 | Handyklingeln während der Besprechung | 1 Kasten |
| 3 | Vergessen persönlicher Gegenstände zum Spiel (Schuhe, Schienbeinschoner usw.) | 2 € je Stück |
| 4 | Liegenlassen persönlicher Gegenstände nach Spiel/Training (Pullover, Schuhe usw.) | 2 € je Stück |
| 5A | Nicht-Tragen der Ausrüstung zum Spiel: Präsentationsanzug Puma (schwarze Hose + rote Jacke) + rotes Polo-Shirt | 2 € je Stück |
| 5B | Nicht-Tragen der Ausrüstung zum Spiel: Aufwärmshirt rot + Aufwärmpullover rot + Regenjacke rot | 2 € je Stück |
| 6 | Nicht-Tragen der Trainingsklamotten | 2 € je Stück |
| 7 | Nicht-Ausführen der Ämter/Aufgaben (z. B. Getränke, Bälle, Essen vorm Spiel) | 5 € |
| 8 | **Unentschuldigtes Fehlen beim Training** | **20 €** |
| 9 | Unentschuldigtes Fehlen beim Spiel | 40 € |
| 10 | Gelbe Karte wegen unsportlichen Verhaltens (Meckern, Beleidigung usw.) | 7 € |
| 11 | Gelb-Rote Karte wegen unsportlichen Verhaltens (Meckern, Beleidigung usw.) | 20 € |
| 12 | Rote Karte wegen unsportlichen Verhaltens (Beleidigung, Tätlichkeit usw.) | 40 € |
| 13A | Unentschuldigte bzw. nicht rechtzeitig angesagte Verspätung zum Spiel/Training: unter 7 Minuten | 2 € |
| 13B | wie 13, über 7 Minuten | 5 € |
| 13C | wie 13, über 20 Minuten | 10 € |

**Rechtzeitig angesagt** (Pos. 13) heißt: beim Training bis 15 Uhr am Trainingstag, beim Spiel bis 2 Stunden vor dem Treffpunkt.

## Zahlungsregeln

- **Fälligkeit:** Eine Strafe ist innerhalb einer Woche beim Kassenwart zu begleichen (bar oder PayPal). Die PayPal-Adresse steht im Original-PDF und wird bewusst nicht ins Repository übernommen (personenbezogene Daten).
- **Verzug:** Jede verspätete Woche erhöht den Strafbetrag um 5 €.
- **Sonderabsprachen:** Abweichungen wie eine Staffelung (Ratenzahlung) sind rechtzeitig mit den Verantwortlichen abzusprechen.

## Umsetzung in SquadHQ

| Katalog | Abbildung in `PenaltyRule` | Hinweis |
| --- | --- | --- |
| Pos. 8 | `position = 8`, `amountCents = 2000`, `trigger = UNEXCUSED_ABSENCE` | einzige Regel, die die PenaltyEngine automatisch vorschlägt (MVP-3) |
| Pos. 9 | `trigger = MANUAL` | SquadHQ kennt im MVP nur Trainings; Spiele als eigener Termintyp kommen später, bis dahin trägt der Kassenwart die Strafe manuell ein |
| Pos. 13A–C | `trigger = LATE`, `position = null`, Unterposition im Titel | `position` ist eindeutig, daher stehen die Unterpositionen 5A/5B und 13A–C im Titel |
| Pos. 1, 2 (Kasten) | `amountCents = 0`, `active = false` | Sachstrafe ohne Geldbetrag, zählt nicht im Saldo; wie in P2 festgelegt erst in Phase 2 |
| Pos. 3–7, 10–12 | `trigger = MANUAL` | werden vom Trainer oder Kassenwart manuell eingetragen |
| Verzug 5 €/Woche | eigene Regel ohne Position, `trigger = MANUAL` | Fälligkeit 7 Tage ab Freigabe durch den Trainer ist umgesetzt (`DUE_DAYS` in `src/domain/penalties.ts`); P4: Kassenwart-Ansicht markiert überfällige Strafen; automatische Erhöhung danach |

## Offene Punkte für die Klärung mit dem Team

- Pos. 13: Was gilt bei genau 7 bzw. genau 20 Minuten? Der Katalog sagt „unter 7“, „über 7“ und „über 20“.
- „Je Stück“ (Pos. 3–6): Soll die App eine Anzahl erfassen oder trägt man pro Gegenstand eine Strafe ein?
- Kasten (Pos. 1, 2): Wird ein Kasten in Euro umgerechnet oder getrennt als Sachstrafe geführt?
