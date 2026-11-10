# P4-Präsentation (Implementierung & Feedback, 11.11.2026)

- [SquadHQ_P4.pptx](SquadHQ_P4.pptx) zum Bearbeiten (Sprechtexte in den Notizen), [SquadHQ_P4.pdf](SquadHQ_P4.pdf) zum Ansehen und Weiterleiten
- 9 Folien: Titel, geplant vs. erreicht, Prototyp P3 → heute (Live-Demo nur auf Nachfrage), Architektur ↔ Code, Coding-Standards, Board nach Phasen, Kundenfeedback, Teststand, nächste Schritte
- Live-Demo: [Demo-Ablauf](../../demo-ablauf.md); am Vortag abends `npm run db:reset`

## Diagramme nach dem P3-Feedback

Übersichtsdiagramme für die Folien, gerendert mit Mermaid 11 aus dem Abschnitt „Übersicht“ der Dateien in [docs/architektur](../../architektur). Die Detailansichten stehen nur dort.

| Bild | Quelle |
| --- | --- |
| [1-komponenten-schichten.png](diagramme/1-komponenten-schichten.png) | Komponenten und Schichtenarchitektur in einem Bild, [komponenten.md](../../architektur/komponenten.md) |
| [2-sequenz.png](diagramme/2-sequenz.png) | Sequenz REQ-PEN-02, [sequenz-pen-02.md](../../architektur/sequenz-pen-02.md) |
| [3-zustandsautomat.png](diagramme/3-zustandsautomat.png) | Zustände einer Strafe, [sequenz-pen-02.md](../../architektur/sequenz-pen-02.md) |
| [4-klassendiagramm.png](diagramme/4-klassendiagramm.png) | Prisma-Modelle, [klassendiagramm.md](../../architektur/klassendiagramm.md) |
| [5-er-modell.png](diagramme/5-er-modell.png) | Tabellen, [er-modell.md](../../architektur/er-modell.md) |

Was sich gegenüber P3 geändert hat und warum: [P3-Feedback und Umsetzung](../../management/p3-feedback-umsetzung.md). Alle Namen: [Namensliste](../../architektur/namensliste.md).

## Coding-Standards

[coding-standards.png](coding-standards.png): Folienbild, Stichpunkte und Sprechtext in [coding-standards.md](coding-standards.md). Ausführlich: [Coding-Guidelines](../../coding-guidelines.md).
