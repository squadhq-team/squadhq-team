# Feedback des Dozenten zu P3 und Umsetzung

> P3 am 04.11.2026, Feedback von Prof. Kai Petersen, notiert von Kirill. Umgesetzt am 09.11.2026 für P4 (11.11.2026).

## Übersicht

| # | Feedback | Was wir geändert haben | Wo |
| --- | --- | --- | --- |
| 1 | Board an Entwicklungsphasen orientieren | Spalten des Boards = Phasen (Anforderungen → Entwurf → Implementierung → Test → Nutzertest), Anleitung unten | [Projekt-Board](https://github.com/users/Kirillv2/projects/1) |
| 2 | Komponentendiagramm: direkte Beschriftungen statt „Fachlogik, Strafregeln, Saldo“ | Jeder Kasten sagt, was er tut: „Einloggen & Rollenprüfung“, „Zu-/Absagen & Anwesenheit“, „Strafen vorschlagen & freigeben“, „Regelverwaltung“, „Protokollierung“; geplante Teile (Registrierung, Kassenwart-Ansicht, Zahlungen verbuchen) gestrichelt | [komponenten.md](../architektur/komponenten.md) |
| 3 | Schichtenarchitektur passt nicht zum Komponentendiagramm | Beides ist jetzt **ein Bild**: die fünf Rahmen sind die Schichten, die Kästen darin die Komponenten. Vorher hatte das Diagramm 6 Kästen und die Folie 5 Schichten mit anderen Namen | [komponenten.md](../architektur/komponenten.md), [architekturbegruendung.md](../architektur/architekturbegruendung.md) |
| 4 | Konsistenz zwischen den Diagrammen | Eine [Namensliste](../architektur/namensliste.md) für alle Diagramme. Sequenzdiagramm nutzt dieselben Komponenten (auch in der Übersicht), Klassen- und ER-Übersicht zeigen dieselben 6 Klassen und 9 Beziehungen, gleiche Kardinalität beim Audit-Log | alle Dateien in [docs/architektur](../architektur) |
| 5 | Bei Next.js auf Modelle und Klassen achten | Klassendiagramm unterscheidet `«Prisma-Modell»` (Daten aus `schema.prisma`) und `«Modul»` (TypeScript-Datei mit Funktionen), denn der Code hat keine Klassen. Code angepasst, damit die Schichten wirklich stimmen: Seiten greifen nicht mehr direkt auf Datenbank oder Fachregeln zu | [klassendiagramm.md](../architektur/klassendiagramm.md), `src/lib/auth.ts`, `src/services/penaltyEngine.ts` |
| 6 | User Experience: visuelles Feedback, z. B. ausgegraut nach dem Klick | Beim Klick: Lade-Kreis am Button, alle Buttons gesperrt (kein Doppelklick), danach kurz ein Haken. Bei Auswahl-Buttons ist die gewählte Option umrandet und die anderen ausgegraut | `src/components/SubmitButton.tsx` |
| 7 | SUS-Fragebogen mit Punkten und Aufgaben mit Zeitmessung | geplant für den Nutzertest am 02.12. (P6) | folgt in `docs/testing` |

Die neuen Übersichtsbilder für die Folien liegen in [docs/praesentation/p4/diagramme](../praesentation/p4/diagramme).

## Anleitung: Board nach Entwicklungsphasen

Das Board ist ein GitHub-Projekt von Kirill; nur Kirill kann Spalten und Karten ändern. Dauer etwa 10 Minuten.

1. [Projekt-Board](https://github.com/users/Kirillv2/projects/1) öffnen, oben die Board-Ansicht wählen.
2. Rechts oben auf **⋯** → **Settings** → links unter **Fields** auf **Status** klicken.
3. Die Optionen so umbenennen bzw. ergänzen (Reihenfolge per Ziehen):
   `Backlog` · `Anforderungen` · `Entwurf` · `Implementierung` · `Test` · `Nutzertest` · `Fertig`
4. Zurück zum Board: Die Spalten heißen jetzt wie die Phasen. Karten per Ziehen in die passende Spalte schieben.
5. Optional: Unter **Fields** ein Feld **Iteration** „Sprint“ (2 Wochen) anlegen, dann sieht man Phase und Sprint zusammen.

Vorschlag für die Zuordnung (Stand 09.11.2026):

| Spalte | Issues |
| --- | --- |
| Backlog | #26 Push-Erinnerungen, #29 Kaderplaner, #30 Beteiligungsquote (alle „nach MVP“) |
| Anforderungen | #33 Feedback-Matrix um REQ-IDs ergänzen |
| Entwurf | #32 Architektur-Entwürfe prüfen, #20 Rollenkonzept (REQ-SEC-01) |
| Implementierung | #21 MVP-1, #22 MVP-2, #24 MVP-3, #25 MVP-4, #44 MVP-5, #28 MVP-6 |
| Test | #34 Testergebnisse dokumentieren |
| Nutzertest | (ab 02.12.: Nutzertest mit SUS-Fragebogen) |
| Fertig | erledigte Issues |

Die Phasen passen zu den Präsentationen: P2 Anforderungen, P3 Entwurf, P4 Implementierung, P5 Qualität & Tests, P6 Nutzertests.
