# Sprechtexte P5 (25.11.2026): Qualität & Tests

Die Texte stehen auch in den Notizen der Folien.

## Folie 1 Titel

Guten Tag. Wir stellen Ihnen heute den Stand von SquadHQ zur Präsentation 5 vor. Das Thema ist Qualität und Tests.

Kurz vorweg: Der Funktionsumfang der App ist inzwischen vollständig umgesetzt. Deshalb lag unser Schwerpunkt in den letzten Wochen auf der Qualität. Wir haben heute 156 automatisierte Tests auf drei Ebenen, die alle bestehen, und jeder Fehler, den wir gefunden haben, ist als Issue dokumentiert und mit einem Regressionstest abgesichert.

Zum Ablauf: Zuerst vergleichen wir geplant und erreicht. Danach zeigen wir unsere Teststrategie und Beispiele für Testfälle, dann die Testergebnisse. Anschließend geht es um unsere Review-Regeln und die gefundenen Defekte, und zum Schluss um das Feedback und den Ausblick auf P6.

## Folie 2 Geplant vs. erreicht

Links sehen Sie, was wir uns in P4 für den Sprint „Features und Design“ vorgenommen haben. Alle Punkte sind erledigt: die Handy-Ansicht, manuelle Strafen aus dem Katalog, Spiele als eigener Termintyp, die automatische Mahngebühr, Einnahmen und Ausgaben, die Anmeldung nur noch mit eigenem Konto, der Team-Code, die Rollenvergabe durch den Trainer und die Fehlzeiten-Übersicht. Auch die drei Qualitätspunkte, also Browser-Tests, die Behebung von D-01 und Reviews per Pull Request, sind umgesetzt.

Rechts sehen Sie, was die App heute insgesamt kann. Neben den sechs MVPs sind das alle Termintypen mit Treffpunkt und Aufstellung, der Spielplan-Import und Erinnerungen per Push und E-Mail. Dazu kommen Teams mit Team-Code und fünf Rollen, die vollständige Teamkasse mit automatischer Mahngebühr von 5 Euro je Woche und PayPal-Link, Chat, Ankündigungen und Umfragen sowie Statistiken mit einer Leistungsbewertung durch den Trainer.

Auf dem Board ist kein Issue mehr offen. Weil die Funktionen damit vollständig sind, haben wir uns für P5 ganz auf die Qualität konzentriert.

## Folie 3 Fortschritt: Board und Teststand

Links unser Board. Die Spalten sind die Phasen des Projekts, gelb markiert ist die aktuelle Phase Test, zu der P5 gehört. Alle Issues sind erledigt: die sechs MVP-Issues, die Issues 45 bis 54 aus dem Sprint „Features und Design“, die Statistik und die vier Defekte. Jede Aufgabe ist ein Issue, und Code kommt nur per Pull Request auf main, nachdem die CI ihn geprüft hat und eine zweite Person ihn im Review gelesen hat.

Rechts sehen Sie den Fortschritt an der Zahl der automatisierten Tests. Zum Prototyp waren es 12, zu P3 25 und zu P4 62. Mit den neuen Features kamen am 12. November viele Tests dazu, mit der Statistik weitere, und heute sind es 156. Jeder dieser Testläufe ist im Repository dokumentiert.

[Board live zeigen: github.com/users/Kirillv2/projects/1]

## Folie 4 Teststrategie: drei Ebenen

Wir testen auf drei Ebenen, hier als Pyramide dargestellt.

Unten stehen 112 Unit-Tests. Sie prüfen jede Fachregel einzeln, zum Beispiel Beträge, Fristen, Rechte und die Statistik, ohne Datenbank und ohne Browser. Darüber liegen 31 Komponententests. Sie spielen ganze Abläufe über unsere Services gegen eine echte PostgreSQL-Datenbank durch, einschließlich des Schutzes für das Audit-Log. Oben stehen 13 Akzeptanztests mit Playwright. Sie klicken die Kernabläufe aus Sicht von Trainer, Spieler und Kassenwart im echten Browser in Handy-Größe durch.

Rechts zwei Punkte, die für uns wichtig sind. Erstens die Wiederholbarkeit: Jeder Lauf beginnt mit demselben Zustand. Die Test-Datenbank wird vorher geleert, jeder Komponententest legt sein eigenes Team an, und die Anmeldung läuft über eine Attrappe, damit keine echten Konten oder E-Mails nötig sind. Uhrzeiten warten wir nicht ab, sondern setzen sie.

Zweitens das Test-Orakel: Das erwartete Ergebnis steht fest im Test und ist aus der Anforderung abgeleitet, nicht aus dem Programm. Zum Beispiel kostet unentschuldigtes Fehlen laut Strafenkatalog Position 8 genau 20 Euro, und die Mahngebühr beträgt 5 Euro je Woche.

Dazu kommen manuelle Prüfungen: Reviews und Inspektionen, ein explorativer Test und der Nutzertest.

## Folie 5 Beispiel-Testfälle und CI

Hier sehen Sie fünf Beispiele aus unserem Testfallkatalog, jeweils mit Eingabe und erwartetem Ergebnis.

Auf Unit-Ebene prüfen wir zum Beispiel die Eingabe einer Teilzahlung: Aus „12,50“ müssen 1250 Cent werden, „abc“ muss abgelehnt werden. Ein zweiter Unit-Test übergibt den Strafenkatalog absichtlich rückwärts sortiert und erwartet die richtige Reihenfolge der Positionen.

Auf Komponentenebene liegt eine Strafe zehn Tage über der Frist, und der Mahnlauf wird zweimal gleichzeitig gestartet. Erwartet werden genau zwei Mahngebühren zu je 5 Euro, für Woche eins und zwei, und keine doppelt.

Auf Akzeptanzebene setzt der Trainer im Browser einen Spieler nach dem Training auf „unentschuldigt“. Erwartet wird der Vorschlag nach Position 8 über 20 Euro und nach der Freigabe der offene Betrag in der Kasse. Ein weiterer Akzeptanztest prüft die Rechte: Der Trainer sieht in der Kasse keinen Button zum Verbuchen, und ein Spieler wird vom Protokoll weggeleitet.

Unten die CI: Bei jedem Pull Request prüft GitHub Actions Lint, Formatierung und Typen, führt die Unit- und Komponententests mit einer eigenen Datenbank aus, baut die App wie auf Vercel und startet die Akzeptanztests im Browser. Nur wenn alles grün ist, wird gemergt.

Alle 156 Testfälle stehen im Testfallkatalog im Repository.

## Folie 6 Testergebnisse

Zu den Ergebnissen: Beim Lauf am 23. November haben alle 156 Tests bestanden, 112 Unit-Tests, 31 Komponententests und 13 Akzeptanztests. Gelaufen sind sie gegen eine leere Test-Datenbank, nicht gegen die Live-Datenbank. Lint, Formatierung, Typen und der Build waren ohne Fehler. Auch die CI auf main ist nach dem Merge grün, einschließlich der Browser-Tests.

Zusätzlich haben wir einen explorativen Test gemacht: Wir haben alle Rollen frei durchgeklickt, auch mit falschen Eingaben wie einem falschen Team-Code, einem Termin in der Vergangenheit oder einem falschen Passwort. Dabei haben wir drei Defekte gefunden, die wir auf der übernächsten Folie zeigen. Alle anderen Fehleingaben hat die App mit einer verständlichen Meldung abgelehnt.

Für die Regressionstests haben wir nachgewiesen, dass sie wirken: Mit dem alten Code schlagen sie fehl, mit der Behebung sind sie grün. Beim Defekt D-01 waren vor der Behebung 6 von 100 Läufen rot, danach 200 von 200 grün.

Alle Läufe sind in docs/testing/akzeptanzkriterien.md dokumentiert.

## Folie 7 Reviews: Regeln und Ergebnis

Unsere Review-Regeln stehen im Review-Protokoll und in Abschnitt 11 der Coding-Guidelines.

Links der Ablauf: Jeder Pull Request enthält automatisch eine Checkliste aus unserer Vorlage. Eine zweite Person, bevorzugt QA, prüft den Code, notiert Funde direkt an der Codezeile und gibt den Pull Request frei oder fordert Änderungen an. Das Ergebnis tragen wir ins Review-Protokoll ein.

In der Mitte die Einstufung der Funde: A ist ein Fehler und muss vor dem Merge behoben werden; ist er schon auf main, wird er als Issue und Defekt erfasst. B ist ein Verstoß gegen unsere Guidelines und wird ebenfalls vor dem Merge behoben. C ist ein Hinweis, der mit Begründung offen bleiben darf. Diagramme, Datenmodell, Anforderungen und Testfallkatalog prüfen wir vor jeder Präsentation in einer Inspektion mit mindestens zwei Personen.

Rechts die Checkliste, zum Beispiel: CI grün, Akzeptanzkriterien erfüllt, Schichtenregel eingehalten, Doku aktuell.

Unten das Ergebnis aus dem Review-Protokoll: Am 23. November wurde der Pull Request 70 mit den Akzeptanztests, dem Testfallkatalog, dem Review-Protokoll und der Behebung von D-02 bis D-04 geprüft. Reviewer war Ömer-Faruk Simsek aus der QA. Es gab keine Funde, der Pull Request wurde freigegeben.

## Folie 8 Defekte D-01 bis D-04

Oben sehen Sie, wie wir mit Defekten umgehen: Jeder Fund bekommt ein Issue mit dem Label „bug“ und eine Nummer im Defekt-Protokoll. Dann schreiben wir zuerst einen Regressionstest, der ohne die Behebung fehlschlägt, beheben den Fehler und schließen das Issue, wenn der Test grün ist.

Insgesamt haben wir vier Defekte gefunden, alle sind behoben. D-01 kennen Sie aus P4: Die Datenbank-Tests waren sporadisch rot, weil der Schutz des Audit-Logs parallel eingespielt wurde. Das läuft jetzt in einer Transaktion mit Sperre. D-02 bis D-04 haben wir beim explorativen Test gefunden: eine falsche Mehrzahl bei genau einem Element, ein falscher Team-Code, der bei der Registrierung ohne Hinweis ignoriert wurde, und eine falsche Reihenfolge im Strafenkatalog.

Besonders wichtig war D-03. Beim Nutzertest treten alle Spieler per Team-Code bei. Ein Tippfehler hätte dazu geführt, dass jemand ohne Team und ohne Hinweis dasteht. Jetzt wird der Code vor dem Anlegen des Kontos geprüft, und man bekommt eine klare Meldung.

## Folie 9 Kundenfeedback und Ausblick auf P6

Links sehen Sie zusammengefasst, welches Feedback wir seit der letzten Präsentation bekommen haben und was wir daraus umgesetzt haben.

Erstens: Nach P4 kam der Hinweis, zuerst den bekannten Fehler zu beheben und erst dann neue Features einzubauen. Genau so haben wir es gemacht. D-01 war am 12. November behoben, danach kamen die Features. Seitdem bekommt jeder Defekt ein Issue und einen Regressionstest.

Zweitens: Auf dem Handy waren einige Spalten nicht sichtbar oder haben sich überlappt. Da die Spieler die App fast nur auf dem Handy nutzen, haben wir das Design für alle Seiten überarbeitet. Unsere Akzeptanztests laufen deshalb auch in Handy-Größe.

Drittens: Spieler sollen sehen können, woran sie arbeiten müssen. Dafür gibt es jetzt die Leistungsbewertung: Der Trainer vergibt nach dem Training Sterne und eine Notiz, und jeder Spieler sieht nur seine eigene Bewertung.

Und viertens die Rückmeldung aus dem Verein: Die App ist übersichtlich, der Trainer sieht, wer mit welchem Grund absagt, und das Verbuchen der Zahlungen hilft dem Kassenwart. Den Kernablauf lassen wir deshalb so, und messbare Ergebnisse holen wir uns im Nutzertest.

Rechts der Ausblick: Am 2. Dezember testen reale Personen vom TSV Kronshagen die App, ein Trainer, ein Kassenwart und mindestens drei Spieler, jeweils auf dem eigenen Handy. Sie lösen Aufgaben mit Zeitmessung und füllen den SUS-Fragebogen aus. Das Material dafür ist fertig. In P6 am 9. Dezember stellen wir Erfolgsquote, Bearbeitungszeiten, den SUS-Wert und unsere Konsequenzen daraus vor, und am 16. Dezember folgen P7 und die Abgabe.

Vielen Dank für Ihre Aufmerksamkeit.
