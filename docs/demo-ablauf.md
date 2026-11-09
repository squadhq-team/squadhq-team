# Demo-Ablauf P4 (ca. 4 Minuten)

Vorher (am Vortag abends): `npm run db:reset`, damit die Demo-Daten zum Präsentationstag passen. Live-App: https://squadhq-omega.vercel.app

Neu seit P3 sind die Schritte 1, 3, 6, 7 und 8.

1. **Startseite → „Registrieren“:** Konto mit Name, E-Mail und Passwort anlegen. Man landet als Spieler in „Mein Bereich“ (Registrierung, REQ-SEC-01). Abmelden.
2. **Als Spieler „Tim Wagner“ (Demo-Anmeldung):** beim nächsten Training Grund „Arbeit“ eintragen, „Fehle entschuldigt“ klicken. Ein Klick, kein Rechtfertigen (REQ-ATT-01).
3. **Als Trainer „Jan Petersen“: „+ Training anlegen“:** Datum und Uhrzeit wählen, speichern. Das Training erscheint bei allen Spielern zum Zusagen (MVP-1).
4. **Vergangenes Training (gestern) öffnen:** Rückmeldungen sichtbar, Noah und Tim haben nicht geantwortet (REQ-ATT-02).
5. **Bei Noah „Unentschuldigt“ klicken, dann „Freigeben“:** Vorschlag „TSVK Pos. 8, 20,00 €“ erst nach Freigabe gebucht (REQ-PEN-02, AK1, AK2).
6. **Als Kassenwart „Karl Brandt“: Teamkasse:** offen, eingenommen, überfällig auf einen Blick (MVP-4). Paul ist rot markiert: Frist abgelaufen, Hinweis auf 5 € Mahngebühr laut Katalog (noch nicht automatisch gebucht).
7. **Bei Noah „Bezahlt (bar)“ klicken:** Strafe wandert zu „Bezahlte Strafen“ (MVP-5, AK4). Optional bei Paul „Teilzahlung verbuchen“ mit 10 € zeigen.
8. **„Protokoll“ öffnen:** Zahlung, Freigabe, Vorschlag und die vom Trainer gesetzte Anwesenheit stehen mit Zeit und Bearbeiter da; Einträge lassen sich nicht ändern oder löschen (MVP-6, AK5, AK6).
9. Optional: als Spieler „Noah Schmidt“ zeigen, dass das Kassenkonto wieder 0,00 € ist.
