# Nutzertest SquadHQ: Testaufgaben mit Zeitmessung

Aufgaben für die drei Rollen im Demo-Team. Ablauf, Vorbereitung und Bewertungsregeln stehen im [Leitfaden](leitfaden.md), der Fragebogen nach den Aufgaben ist der [SUS-Fragebogen](sus-fragebogen.md).

Die Testperson bekommt nur Szenario und Aufgabentext (Aufgabenkarte). Zielzeit, Erfolgskriterium und „Worauf achten“ sind nur für uns (Protokollbogen). Die Zielzeiten sind Schätzungen und werden nach dem Pilotdurchlauf geprüft.

Für jede Aufgabe notieren wir auf dem Protokollbogen: **Start, Ende, Dauer in Sekunden, Erfolg (ja / teilweise / nein), Anzahl Fehler, Hilfe nötig, Beobachtungen.**

| Rolle | Testkonto | Aufgaben | Summe Zielzeiten |
|---|---|---|---|
| Spieler (Paul Thomsen) | `spieler@squadhq.test` | 7 | 4 min 35 s |
| Trainer (Jan Petersen) | `trainer@squadhq.test` | 8 | 7 min 30 s |
| Kassenwart (Karl Brandt) | `kassenwart@squadhq.test` | 8 | 7 min 45 s |

Passwort für alle Testkonten: `SquadHQ-Test26`. [Spieler X], [Spieler Y] und [Spieler Z] legt die Moderation vor jeder Testperson fest (siehe Leitfaden).

## Spieler: Paul Thomsen

**Szenario (vorlesen):** Du bist Paul Thomsen, Spieler in der 1. Herren. Dein Team organisiert Trainings, Spiele und die Mannschaftskasse ab sofort mit SquadHQ.

| Nr. | Aufgabe (vorlesen) | Zielzeit | Erfolgreich, wenn … | Worauf achten |
|---|---|---|---|---|
| S1 | Melde dich bei SquadHQ an. E-Mail: spieler@squadhq.test, Passwort: SquadHQ-Test26 | 45 s | Startseite „Hallo Paul“ ist zu sehen. | Findet die Person das Anmeldeformular sofort? Tippfehler im Passwort zählen als Fehler. |
| S2 | Sag für das nächste Training zu: Du bist dabei. | 20 s | Beim nächsten Training ist „Dabei“ ausgewählt. | Wird direkt auf der Startseite zugesagt oder erst der Termin geöffnet? |
| S3 | Beim Termin danach kannst du nicht, weil du arbeiten musst. Sag ab und gib „Arbeit“ als Grund an. | 1 min | Beim zweiten kommenden Termin ist „Fehle“ ausgewählt und unter „Wer kommt?“ steht „Arbeit“. | Das Grund-Feld gibt es nur in der Termin-Ansicht. Wird erst „Fehle“ geklickt und danach der Grund vergeblich gesucht? |
| S4 | Finde heraus, wo das nächste Training stattfindet und bis wann du spätestens zu- oder absagen musst. | 30 s | Ort und „Antwort bis“ werden richtig genannt. | Werden die Zeitangaben (Treffen, Beginn, Antwort bis) verstanden? |
| S5 | Wie viel Geld musst du noch in die Mannschaftskasse zahlen, und wofür? | 45 s | Betrag und mindestens ein Grund (z. B. „Unentschuldigtes Fehlen beim Training“) werden genannt. | Startseite (Kassenkonto) oder Bereich „Kasse“? Wird „Überfällig“ verstanden? |
| S6 | Du möchtest den offenen Betrag per PayPal bezahlen. Zeig, wie du dorthin kommst. Auf der PayPal-Seite bitte abbrechen, nichts bezahlen. | 30 s | Button „Per PayPal zahlen“ wurde geklickt, PayPal-Seite öffnet sich. | Erwartet die Person den Betrag schon ausgefüllt? |
| S7 | Schreib deinem Team im Chat: „Bin heute 10 Minuten später da.“ | 45 s | Nachricht steht im Team-Chat. | Wird der Chat in der Navigation gefunden? |

## Trainer: Jan Petersen

**Szenario (vorlesen):** Du bist Jan Petersen, Trainer der 1. Herren. Du planst Trainings, behältst die Anwesenheit im Blick und entscheidest über Strafen.

| Nr. | Aufgabe (vorlesen) | Zielzeit | Erfolgreich, wenn … | Worauf achten |
|---|---|---|---|---|
| T1 | Melde dich bei SquadHQ an. E-Mail: trainer@squadhq.test, Passwort: SquadHQ-Test26 | 45 s | Startseite „Hallo Jan“ ist zu sehen. | Findet die Person das Anmeldeformular sofort? Tippfehler im Passwort zählen als Fehler. |
| T2 | Wie viele Spieler haben für das nächste Training schon zugesagt, und wer hat noch nicht geantwortet? | 45 s | Anzahl „dabei“ stimmt und die Namen unter „Noch keine Antwort“ werden genannt. | Reichen die Zähler auf der Karte oder wird der Termin geöffnet? |
| T3 | Lege ein Training für nächsten Dienstag um 19:00 Uhr auf dem Kunstrasen an. Treffen ist um 18:45 Uhr. | 2 min | Training steht unter „Termine“ mit richtigem Datum, 19:00 Uhr, Ort „Kunstrasen“ und Treffen 18:45 Uhr. | Wird „Treffen um“ unter „Zusatzinfos“ gefunden? Probleme mit dem Datumsfeld? |
| T4 | Beim letzten Training hat [Spieler X] unentschuldigt gefehlt. Trage das ein. | 1 min | Beim letzten vergangenen Training steht [Spieler X] auf „Unentsch.“. | Wird das vergangene Training gefunden (Liste unten unter „Termine“)? |
| T5 | Sorge dafür, dass die Strafe für [Spieler X] jetzt in der Mannschaftskasse zählt. | 45 s | Strafvorschlag für [Spieler X] ist freigegeben (steht nicht mehr unter „Freigabe“). | Wird verstanden, dass ein Vorschlag erst nach „Freigeben“ zählt? |
| T6 | Informiere das ganze Team mit einer Ankündigung: „Training am Donnerstag fällt aus.“ | 1 min | Ankündigung ist unter „Neuigkeiten“ veröffentlicht. | Wo wird gesucht: Chat, Termine oder Neuigkeiten auf der Startseite? |
| T7 | Ein neuer Spieler möchte ins Team. Finde den Code, mit dem er beitreten kann. | 30 s | Team-Code wird vorgelesen. | Nicht „Neuen Code erzeugen“ klicken lassen; falls doch, notieren. |
| T8 | Das Training, das du vorhin angelegt hast, fällt aus. Sag es ab. | 45 s | Training ist durchgestrichen und als „Abgesagt“ markiert. | Wird „Bearbeiten oder absagen“ gefunden? |

## Kassenwart: Karl Brandt

**Szenario (vorlesen):** Du bist Karl Brandt, Spieler und Kassenwart der 1. Herren. Du kümmerst dich um die Mannschaftskasse: Strafen, Zahlungen, Einnahmen und Ausgaben.

| Nr. | Aufgabe (vorlesen) | Zielzeit | Erfolgreich, wenn … | Worauf achten |
|---|---|---|---|---|
| K1 | Melde dich bei SquadHQ an. E-Mail: kassenwart@squadhq.test, Passwort: SquadHQ-Test26 | 45 s | Startseite „Hallo Karl“ ist zu sehen. | Findet die Person das Anmeldeformular sofort? Tippfehler im Passwort zählen als Fehler. |
| K2 | Wie viel Geld ist insgesamt noch offen, und wer ist mit dem Zahlen überfällig? | 45 s | Offener Betrag und mindestens ein Name mit „Überfällig“ werden genannt. | Werden die Kennzahlen oben in der Kasse verstanden? |
| K3 | [Spieler Y] gibt dir seine Strafe in bar. Verbuche die Zahlung. | 45 s | Strafe von [Spieler Y] steht im Reiter „Bezahlt“ als „Bezahlt (bar)“. | Unsicherheit, ob der Klick sofort bucht? |
| K4 | [Spieler Z] hat dir von seiner Strafe erst 10 € per PayPal geschickt. Verbuche das. | 1 min 30 s | Strafe von [Spieler Z] steht auf „Teilweise bezahlt“, offener Rest um 10 € kleiner. | Wird „Mehr: Teilzahlung …“ gefunden? Wird fälschlich „Bezahlt (PayPal)“ geklickt? |
| K5 | Du hast für 25 € neue Bälle gekauft. Trage die Ausgabe in die Kasse ein. | 1 min | Ausgabe 25 € „Bälle“ steht im Kassenbuch. | Wird „+ Ein-/Ausgabe“ gefunden? Wird „Ausgabe“ ausgewählt? |
| K6 | Ben Albers hat zum Training seine Trainingssachen vergessen. Lege dafür die Strafe aus dem Strafenkatalog an. | 1 min | Strafvorschlag „Nicht-Tragen der Trainingsklamotten“ für Ben Albers ist angelegt. | Wird die passende Katalog-Position gefunden? Wird verstanden, dass der Trainer noch freigeben muss? |
| K7 | Spieler sollen ihre Strafen per PayPal bezahlen können. Hinterlege dafür den PayPal-Namen „squadhqtest“. | 1 min | Unter Kasse → „PayPal“ ist der Name gespeichert. | Wird der Reiter „PayPal“ gefunden? Falls schon ein Name drinsteht: Wird er erkannt und bestätigt? |
| K8 | Ein Spieler behauptet, seine Strafe wurde nie freigegeben. Finde heraus, wer zuletzt eine Strafe freigegeben hat und wann. | 1 min | Name und Zeitpunkt des neuesten Eintrags „Strafe freigegeben“ im Protokoll werden genannt. | Wird das Protokoll gefunden (Button in der Kasse)? |

## Protokollbogen (Vorlage je Aufgabe)

| Nr. | Zielzeit | Start | Ende | Dauer (s) | Erfolg (ja / teilw. / nein) | Fehler | Hilfe | Beobachtungen |
|---|---|---|---|---|---|---|---|---|
| S2 | 20 s | 14:03:10 | 14:03:24 | 14 | ja | 0 | ☐ | sagt direkt auf der Startseite zu |

Die druckfertigen Bögen (Aufgabenkarten und Protokollbögen je Rolle) liegen als PDF beim Team, die Auswertung in `auswertung-nutzertest.xlsx`.
