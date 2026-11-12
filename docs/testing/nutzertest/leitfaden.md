# Nutzertest SquadHQ: Leitfaden für die Moderation

Wir testen SquadHQ mit einer echten Mannschaft und echten Daten, nicht mit Testkonten: Der Trainer registriert sich, gründet das Team und lädt seine Spieler per Link ein. Danach testet jede Person die Funktionen ihrer Rolle als Spieler, Kassenwart oder Trainer. Wir messen die drei Kriterien der Gebrauchstauglichkeit nach ISO 9241-11:

| Kriterium | Messgröße | Material |
|---|---|---|
| Effektivität | Erfolgsquote je Aufgabe (ja / teilweise / nein) | [Testaufgaben](testaufgaben.md), Protokollbogen |
| Effizienz | Bearbeitungszeit je Aufgabe im Vergleich zur Zielzeit, Anzahl Fehler | [Testaufgaben](testaufgaben.md), Protokollbogen |
| Zufriedenheit | SUS-Wert (0 bis 100) | [SUS-Fragebogen](sus-fragebogen.md) |

Der Fragebogen ist bewusst **nicht** in der App, sondern wird ausgedruckt und auf Papier ausgefüllt. Die Auswertung erfolgt in `auswertung-nutzertest.xlsx`.

## Wer macht mit

| Wer | Anzahl | Testet |
|---|---|---|
| Trainer der Mannschaft | 1 | Trainer-Aufgaben |
| Spieler, der Kassenwart wird | 1 | erst Spieler-Aufgaben, dann Kassenwart-Aufgaben |
| weitere Spieler | mindestens 3 | Spieler-Aufgaben |

Jede Testperson braucht **ihr eigenes Handy**, Zugriff auf **ihr E-Mail-Postfach** (für die Bestätigungsmail) und muss in einer gemeinsamen **WhatsApp-Gruppe** sein, in die der Trainer die Einladung schickt. Die Namen der Testpersonen kennen wir vorher nicht; sie stehen erst nach der Registrierung in der App. Auf unseren Bögen notieren wir nur Kürzel (T01, T02, …).

**Beobachter:** Möglichst jede Testperson bekommt ein eigenes Teammitglied als Beobachter, das Zeit stoppt und den Protokollbogen führt. In den Spieler-Phasen arbeiten alle Spieler gleichzeitig. Sind wir zu wenige, beobachtet eine Person zwei Spieler nebeneinander oder die Spieler kommen nacheinander dran.

Beobachter helfen nicht. Bei Fragen: „Was würdest du jetzt versuchen?“

## Ablauf (ca. 60 Minuten)

Die Aufgaben bauen aufeinander auf: Erst gibt es das Team, dann die Spieler, dann die Kasse. Deshalb arbeiten wir in Phasen. Wer gerade keine Phase hat, wartet und schaut nicht auf die Handys der anderen.

| Phase | Wer | Was | ca. Min. |
|---|---|---|---|
| 0 | Moderation | Begrüßung, Einverständnis, Platzhalter festlegen, Aufgabenkarten verteilen | 5 |
| 1 | Trainer | Registrieren, Team gründen, Strafenkatalog, Training heute und Spiel am Sonntag anlegen, Einladung schicken | 12 |
| 2 | Spieler (alle, auch die künftige Kassenwart-Person) | Über den Einladungslink registrieren, Profil, Zusage Training, Absage Spiel mit Grund | 10 |
| 3 | Trainer | Zusagen ansehen, Kassenwart ernennen, Ankündigung | 5 |
| 4 | Kassenwart | PayPal-Name, Beitrag für alle, Strafe vergeben | 6 |
| 5 | Spieler (alle) | Kassenkonto prüfen, PayPal-Weg zeigen, Chat | 5 |
| 6 | Trainer, **erst nach Beginn des Testtrainings** | Anwesenheit bestätigen, Strafen freigeben | 5 |
| 7 | Kassenwart | Überblick, Barzahlung, Teilzahlung, Ausgabe, Protokoll | 8 |
| 8 | Alle | SUS-Fragebogen (allein ausfüllen), danach kurzes Gespräch | 8 |

Das Testtraining aus Phase 1 muss beginnen, bevor Phase 6 startet, sonst lässt sich die Anwesenheit noch nicht bestätigen. Deshalb legt der Trainer es auf **ca. 45 Minuten nach Teststart** an. Ist die Zeit noch nicht erreicht, ziehen wir Phase 8 für die Spieler vor.

## Platzhalter festlegen (Phase 0)

Einige Aufgaben enthalten Platzhalter. Die Moderation legt sie zu Beginn fest und trägt sie auf den Aufgabenkarten (leere Linie) und im Kopf des Protokollbogens ein. Da wir die Namen vorher nicht kennen, reicht der Vorname bzw. wer es ist („der mit der roten Jacke“).

| Platzhalter | Wer oder was |
|---|---|
| [Uhrzeit] | Beginn des Testtrainings heute, ca. 45 Minuten nach Teststart |
| [Kassenwart-Person] | die Testperson, die Kassenwart wird |
| [Fehlende Person] | ein Spieler, der beim Testtraining als unentschuldigt gilt. Er wählt in Phase 2 bei der Zusage „Unsicher“ statt „Dabei“ (leise ansagen, nicht vor dem Trainer). |
| [Spieler A] | ein Spieler, der die Zuspät-Strafe bekommt (nicht die Kassenwart-Person) |
| [Spieler B] | ein Spieler, der den Beitrag bar bezahlt (nicht Spieler C) |
| [Spieler C] | ein Spieler, der 2 € per PayPal anzahlt (nicht Spieler B) |

Es fließt kein echtes Geld: Barzahlung und PayPal-Zahlung werden nur gespielt, auf der PayPal-Seite brechen alle ab.

## Vorbereitung vor dem Testtag

- [ ] Die aktuelle Version ist auf https://squadhq-omega.vercel.app deployt.
- [ ] Die **Bestätigungsmail kommt an**: einmal selbst mit einer neuen E-Mail-Adresse registrieren, Mail bestätigen (auch Spam-Ordner prüfen), Konto danach unter Profil → „Konto endgültig löschen“ wieder löschen.
- [ ] In Supabase unter Authentication → Rate Limits ist das Mail-Limit hoch genug (Standard bei eigenem SMTP sind 30 Mails pro Stunde, besser z. B. 100), sonst bekommen bei vielen gleichzeitigen Registrierungen nicht alle eine Bestätigungsmail.
- [ ] Ein Teammitglied, das die App nicht selbst gebaut hat, macht einen **Pilotdurchlauf** mit allen Phasen (eigene Konten, eigenes Pilot-Team). Ist eine Zielzeit dabei offensichtlich unrealistisch, passen wir sie vor dem echten Test an und halten das fest. Das Pilot-Team danach löschen (Konten löschen).
- [ ] Ausdrucke: je Testperson eine Aufgabenkarte ihrer Rolle, ein Protokollbogen ihrer Rolle (Kassenwart-Person: Spieler- und Kassenwart-Bogen) und ein SUS-Fragebogen. Stoppuhr am Handy für jeden Beobachter.

## Begrüßung (Phase 0), sinngemäß vorlesen

> „Danke, dass ihr mitmacht. Wir testen heute nicht euch, sondern unsere App. Wenn etwas nicht klappt, ist das ein Fehler der App, und genau das wollen wir finden. Bitte sagt laut, was ihr denkt, was ihr sucht und was euch wundert. Wir dürfen euch während der Aufgaben nicht helfen.
> Ihr legt dafür echte Konten mit eurem Namen und eurer E-Mail-Adresse an. Die Daten bleiben in unserer App und werden nicht weitergegeben; wer möchte, kann sein Konto nach dem Test im Profil selbst löschen. Unsere Notizen und der Fragebogen sind anonym, wir notieren nur Kürzel. Ist das für euch in Ordnung?“

Einverständnis je Person auf dem Protokollbogen ankreuzen. Wer nicht mit eigener E-Mail mitmachen möchte, darf eine Wegwerf-Adresse nutzen, braucht aber Zugriff darauf.

## Regeln für die Zeitmessung und Bewertung

Die Zeit läuft nach dem Vorlesen der Aufgabe, sobald die Testperson das Handy berührt, und stoppt, wenn das Erfolgskriterium erreicht ist oder die Testperson „fertig“ bzw. „ich gebe auf“ sagt. Bei den Registrierungen notieren wir zusätzlich, wie lange die Bestätigungsmail gebraucht hat.

| Feld | Regel |
|---|---|
| **Dauer** | in Sekunden, von Start bis Ende |
| **Erfolg: ja** | Erfolgskriterium ohne Hilfe erreicht |
| **Erfolg: teilweise** | erreicht, aber nur mit einem Hinweis von uns oder mit einem falschen Detail (z. B. falsche Uhrzeit) |
| **Erfolg: nein** | aufgegeben, falsches Ergebnis, oder nach der **doppelten Zielzeit** abgebrochen |
| **Fehler** | jede Aktion, die vom Ziel wegführt und korrigiert werden muss: falscher Bereich geöffnet, falscher Button, Eingabe korrigiert. Zählen, nicht bewerten. |
| **Hilfe** | ankreuzen, sobald wir eingreifen. Erst nach 1× Zielzeit einen kleinen Hinweis geben („Schau mal unten in der Leiste“), nie die Lösung zeigen. |
| **Beobachtungen** | wörtliche Zitate in Anführungszeichen, Zögern, Suchen, Überraschungen |

Scheitert eine Aufgabe, auf der spätere aufbauen (z. B. Team gründen, Einladung schicken, Kassenwart ernennen), stellen wir den nötigen Zustand selbst her, damit die anderen weitermachen können, und notieren das.

## Nach dem Test

Das Team bleibt in der App bestehen und kann von der Mannschaft weiter genutzt werden. Testbuchungen (Beitrag, Strafen, Ausgabe) kann der Kassenwart in der Kasse stornieren; wer sein Konto nicht behalten möchte, löscht es im Profil.

> ⚠️ Niemals `npm run db:reset` auf der Live-Datenbank ausführen. Das löscht alle echten Teams und Nutzer.

## Auswertung

1. Protokollbögen und Fragebögen direkt nach dem Test in `auswertung-nutzertest.xlsx` übertragen. Die Tabelle berechnet SUS-Werte, Erfolgsquoten und mittlere Zeiten automatisch.
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
5. **Für die Präsentation:** Wer hat getestet (Anzahl, Rollen, echte Mannschaft), wie (eigene Konten, Aufgaben mit Zeitmessung + SUS), Ergebnis (SUS-Mittelwert, Erfolgsquoten, wichtigste Probleme), Konsequenz (welche Issues wir daraus umgesetzt haben).

Ziel sind mindestens **fünf Testpersonen** außerhalb des Projektteams; schon fünf Personen decken erfahrungsgemäß die meisten Bedienprobleme auf (Nielsen & Landauer 1993). Testen mehrere Mannschaften, läuft der Ablauf je Mannschaft einmal komplett, mit fortlaufenden Kürzeln.
