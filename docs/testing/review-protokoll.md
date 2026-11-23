# Reviews und Inspektionen

Hier steht, wie wir Code und Dokumente prüfen, und das Ergebnis jeder Prüfung. Die Regeln für den Code selbst stehen in
den [Coding-Guidelines](../coding-guidelines.md), die Checkliste dort in Abschnitt 11.

## 1. Code-Review (jeder Pull Request)

**Wer:** eine zweite Person aus dem Team, nicht die Person, die den Code geschrieben hat. Bevorzugt QA (Ömer-Faruk).
**Wann:** bevor gemergt wird. Ohne Review kein Merge auf `main`, außer bei reiner Doku (siehe Coding-Guidelines, Abschnitt 11).

**Ablauf auf GitHub**

1. Pull Request öffnen → Reiter **Files changed**.
2. Die Checkliste aus der PR-Beschreibung durchgehen (kommt automatisch aus `.github/pull_request_template.md`).
3. Zu einzelnen Zeilen: auf das **+** neben der Zeile klicken und den Fund aufschreiben.
4. Oben rechts **Review changes** → *Approve* (in Ordnung), *Request changes* (muss geändert werden) oder *Comment*.
5. Die Autorin/der Autor bessert nach und antwortet auf jeden Kommentar. Danach prüft die Reviewerin/der Reviewer erneut.
6. Ergebnis unten in die Tabelle „Ergebnisse“ eintragen.

**Funde einstufen**

| Stufe | Bedeutung | Folge |
|---|---|---|
| A – Fehler | falsches Verhalten, Sicherheitslücke, Anforderung nicht erfüllt | muss vor dem Merge behoben werden; bei Fehlern auf `main` als Issue mit Label `bug` und Eintrag D-xx im [Defekt-Protokoll](akzeptanzkriterien.md#gefundene-defekte) |
| B – Regelverstoß | Guidelines nicht eingehalten (Benennung, Schichten, fehlender Test, Doku veraltet) | vor dem Merge beheben |
| C – Hinweis | Vorschlag, Geschmack, Lesbarkeit | darf offen bleiben, Begründung im Kommentar |

## 2. Inspektion von Dokumenten und Diagrammen

**Was:** Diagramme (`docs/architektur/`), Datenmodell, Anforderungen und Testfallkatalog.
**Wann:** vor jeder Präsentation und wenn sich das Datenmodell oder eine Anforderung ändert.
**Wer:** mindestens zwei Personen. Eine liest vor, eine vergleicht mit dem Code.

Prüffragen:

1. Stimmt jedes Diagramm mit dem Code überein (Klassen und Felder wie in `prisma/schema.prisma`, Namen wie in der [Namensliste](../architektur/namensliste.md))?
2. Rendern alle Mermaid-Diagramme ohne Fehler?
3. Hat jede Anforderung mindestens einen Testfall ([Traceability](../traceability.md), [Testfallkatalog](testfallkatalog.md))?
4. Sind Zahlen in Doku und Folien aktuell (Anzahl Tests, Beträge, Fristen)?

## 3. Ergebnisse

Eine Zeile je Review oder Inspektion. Funde mit Stufe A bekommen eine Defekt-Nummer.

| Datum | Was wurde geprüft | Autor/in | Reviewer/in | Funde (A / B / C) | Ergebnis | Link |
|---|---|---|---|---|---|---|
| | | | | | | |
