# Nutzertest SquadHQ: Leitfaden für die Moderation

Mit den Nutzertests prüfen wir, ob echte Spieler, Trainer und Kassenwarte SquadHQ ohne Hilfe bedienen können. Wir messen die drei Kriterien der Gebrauchstauglichkeit nach ISO 9241-11:

| Kriterium | Messgröße | Material |
|---|---|---|
| Effektivität | Erfolgsquote je Aufgabe (ja / teilweise / nein) | [Testaufgaben](testaufgaben.md), Protokollbogen |
| Effizienz | Bearbeitungszeit je Aufgabe im Vergleich zur Zielzeit, Anzahl Fehler | [Testaufgaben](testaufgaben.md), Protokollbogen |
| Zufriedenheit | SUS-Wert (0 bis 100) | [SUS-Fragebogen](sus-fragebogen.md) |

Der Fragebogen ist bewusst **nicht** in der App, sondern wird ausgedruckt und auf Papier ausgefüllt. Die Auswertung erfolgt in `auswertung-nutzertest.xlsx`.

## Wer macht was

- **Moderation:** begrüßt, gibt die Aufgabenkarte, liest jede Aufgabe vor und hilft nicht. Bei Fragen der Testperson: „Was würdest du jetzt versuchen?“
- **Protokoll:** stoppt die Zeit, zählt Fehler und notiert Beobachtungen und Zitate auf dem Protokollbogen.

Wenn nur eine Person aus dem Team da ist, übernimmt sie beides; die Zeit läuft dann per Handy-Stoppuhr mit.

## Material je Testperson

| Material | Anzahl | Datei |
|---|---|---|
| Aufgabenkarte der Rolle (für die Testperson) | 1 | `2-Aufgabenkarten-Testperson.pdf`, Seite der Rolle |
| Protokollbogen der Rolle (für uns) | 1 | `3-Protokollbogen.pdf`, Seite der Rolle |
| SUS-Fragebogen | 1 | `4-SUS-Fragebogen.pdf` |
| Handy oder Laptop mit https://squadhq-omega.vercel.app | 1 | – |
| Stoppuhr (Handy) | 1 | – |

Die Testperson nutzt am besten **ihr eigenes Handy**, so wie sie die App später auch nutzen würde. Vorher abmelden bzw. im privaten Tab öffnen, damit niemand schon angemeldet ist.

## Vorbereitung vor jedem Testtag

Alle Testpersonen arbeiten im Demo-Team „TSV Kronshagen 1. Herren (Demo)“ mit den drei Testkonten aus der README. Was eine Testperson ändert, sieht die nächste. Deshalb vorher einmal als Trainer und Kassenwart prüfen:

- [ ] Anmelden mit `trainer@squadhq.test`, `spieler@squadhq.test` und `kassenwart@squadhq.test` (Passwort `SquadHQ-Test26`) funktioniert.
- [ ] Es gibt **mindestens zwei kommende Termine**, davon das nächste ein Training. Sonst als Trainer neue Trainings anlegen (die Demo-Termine von `db:reset` liegen irgendwann in der Vergangenheit).
- [ ] Das **letzte vergangene Training** hat noch Spieler mit „Da“ (für Trainer-Aufgabe 4).
- [ ] Es gibt **offene Strafen** bei mindestens zwei Spielern außer Paul Thomsen (für Kassenwart-Aufgaben 3 und 4). Sonst als Trainer per „+ Strafe“ welche anlegen.
- [ ] **Paul Thomsen** hat einen offenen Betrag und unter Kasse → „PayPal“ ist ein PayPal-Name hinterlegt (für Spieler-Aufgaben 5 und 6). Pauls Strafen deshalb nie in Kassenwart-Aufgaben verwenden.
- [ ] **Vor jeder Spieler-Testperson:** mit dem Spieler-Konto bei den nächsten zwei Terminen „Unsicher“ wählen und das Feld „Grund (optional)“ leeren. So startet jede Testperson mit demselben Stand für die Spieler-Aufgaben 2 und 3. Danach abmelden.

> ⚠️ Niemals `npm run db:reset` auf der Live-Datenbank ausführen, um Testdaten aufzufrischen. Das löscht auch alle echten Teams und Nutzer.

**Platzhalter festlegen:** Die Aufgaben enthalten [Spieler X], [Spieler Y] und [Spieler Z]. Vor jeder Testperson Namen eintragen (auf Karte und Protokollbogen):

- **[Spieler X]** (Trainer): ein Spieler, der beim letzten vergangenen Training auf „Da“ steht.
- **[Spieler Y]** und **[Spieler Z]** (Kassenwart): zwei verschiedene Spieler mit offener Strafe, nicht Paul Thomsen.

Die Zielzeiten in den Aufgaben sind Schätzungen. Bevor echte Testpersonen drankommen, führt ein Teammitglied, das die App nicht selbst gebaut hat, einen **Pilotdurchlauf** durch. Ist eine Zielzeit dabei offensichtlich unrealistisch, passen wir sie vor dem ersten echten Test an und halten das fest.

## Ablauf je Testperson (ca. 20 Minuten)

1. **Begrüßung (2 Min.)**, sinngemäß vorlesen:
   > „Danke, dass du mitmachst. Wir testen heute nicht dich, sondern unsere App. Wenn etwas nicht klappt, ist das ein Fehler der App, und genau das wollen wir finden. Bitte sag laut, was du denkst, was du suchst und was dich wundert. Ich darf dir während der Aufgaben nicht helfen. Wir notieren keine Namen, die Auswertung ist anonym. Ist das für dich in Ordnung?“
2. **Einverständnis** einholen und auf dem Protokollbogen ankreuzen. Kürzel vergeben: T01, T02, … (fortlaufend über alle Testtage).
3. **Szenario vorlesen** (steht oben auf der Aufgabenkarte) und die Karte übergeben.
4. **Aufgaben (10 bis 12 Min.):** Jede Aufgabe einzeln vorlesen. Die Zeit läuft nach dem Vorlesen, sobald die Testperson das Gerät berührt; sie stoppt, wenn das Erfolgskriterium erreicht ist oder die Testperson „fertig“ bzw. „ich gebe auf“ sagt.
5. **SUS-Fragebogen (3 Min.):** direkt nach den Aufgaben, bevor wir über die App sprechen. Die Testperson füllt ihn allein aus.
6. **Kurzes Gespräch (3 Min.):** die drei offenen Fragen unten auf dem Fragebogen durchgehen und auffällige Stellen aus den Aufgaben nachfragen („Bei Aufgabe 3 hast du gezögert, was hast du erwartet?“).
7. **Danke sagen**, abmelden, Gerät zurücksetzen.

## Regeln für die Bewertung

| Feld | Regel |
|---|---|
| **Dauer** | in Sekunden, von Start bis Ende |
| **Erfolg: ja** | Erfolgskriterium ohne Hilfe erreicht |
| **Erfolg: teilweise** | erreicht, aber nur mit einem Hinweis von uns oder mit einem falschen Detail (z. B. falsche Uhrzeit) |
| **Erfolg: nein** | aufgegeben, falsches Ergebnis, oder nach der **doppelten Zielzeit** abgebrochen |
| **Fehler** | jede Aktion, die vom Ziel wegführt und korrigiert werden muss: falscher Bereich geöffnet, falscher Button, Eingabe korrigiert. Zählen, nicht bewerten. |
| **Hilfe** | ankreuzen, sobald wir eingreifen. Erst nach 1× Zielzeit einen kleinen Hinweis geben („Schau mal unten in der Leiste“), nie die Lösung zeigen. |
| **Beobachtungen** | wörtliche Zitate in Anführungszeichen, Zögern, Suchen, Überraschungen |

Baut eine Aufgabe auf einer vorigen auf (Trainer 4 → 5, Trainer 3 → 8) und die vorige ist gescheitert, richten wir den Ausgangszustand kurz selbst her und notieren das.

## Auswertung

1. Protokollbögen und Fragebögen nach jedem Testtag in `auswertung-nutzertest.xlsx` übertragen. Die Tabelle berechnet SUS-Werte, Erfolgsquoten und mittlere Zeiten automatisch.
2. **SUS-Wert je Person:** Ungerade Aussagen (1, 3, 5, 7, 9): Kreuz − 1. Gerade Aussagen (2, 4, 6, 8, 10): 5 − Kreuz. Alle zehn Werte addieren und mit 2,5 multiplizieren. Ergebnis: 0 bis 100. Fehlt ein Kreuz, wird 3 (Mitte) angenommen und das notiert.
3. **Einordnung** (Bangor, Kortum & Miller 2009; Sauro 2011):

   | SUS-Wert | Einordnung |
   |---|---|
   | über 80,3 | sehr gut (obere 10 %) |
   | 68 bis 80,3 | gut, über dem Durchschnitt |
   | 68 | Durchschnitt vieler untersuchter Systeme |
   | 51 bis 68 | unterdurchschnittlich, Nachbesserung nötig |
   | unter 51 | schlecht, deutliche Probleme |

4. **Befunde sammeln:** Jedes beobachtete Problem bekommt einen Schweregrad (1 = kosmetisch, 2 = gering, 3 = groß, 4 = kritisch: Aufgabe nicht lösbar). Probleme ab Schweregrad 2 legen wir als Issue mit dem Label „Nutzertest“ an und verlinken die Testpersonen-Kürzel.
5. **Für die Präsentation:** Wer hat getestet (Anzahl, Rollen), wie (Aufgaben mit Zeitmessung + SUS), Ergebnis (SUS-Mittelwert, Erfolgsquoten, wichtigste Probleme), Konsequenz (welche Issues wir daraus umgesetzt haben).

Ziel sind mindestens **fünf Testpersonen** außerhalb des Projektteams, möglichst jede Rolle mehrfach; schon fünf Personen decken erfahrungsgemäß die meisten Bedienprobleme auf (Nielsen & Landauer 1993). Gibt es nicht genug echte Trainer oder Kassenwarte, übernehmen Spieler diese Rollen; das vermerken wir im Protokollbogen unter „Rolle im echten Team“.
