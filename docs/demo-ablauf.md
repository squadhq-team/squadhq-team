# Demo-Ablauf P3 (ca. 3 Minuten)

Vorher: `npm run db:reset`, damit die Demo-Daten frisch sind.

1. **Startseite:** Demo-Anmeldung zeigen. Rollen erklären (REQ-SEC-01).
2. **Als Spieler „Tim Wagner“:** beim nächsten Training Grund „Arbeit“ eintragen, „Fehle entschuldigt“ klicken. Ein Klick, kein Rechtfertigen (Feedback Spieler, REQ-ATT-01). Kassenkonto: 0,00 €.
3. **Abmelden, als Trainer „Jan Petersen“:** Dashboard mit kommenden und vergangenen Trainings. Das kommende Training zeigt Tims Absage.
4. **Vergangenes Training (gestern) öffnen:** Rückmeldungen sichtbar, Noah und Tim haben nicht geantwortet (REQ-ATT-02).
5. **Bei Noah „Unentschuldigt“ klicken:** Der Strafvorschlag „TSVK Pos. 8, 20,00 €“ erscheint, aber noch keine Buchung (Feedback Trainer, REQ-PEN-02, AK1).
6. **„Freigeben“ klicken** (AK2).
7. **Abmelden, als Spieler „Noah Schmidt“:** Kassenkonto zeigt 20,00 € offen, fällig in 7 Tagen (REQ-PEN-03).
8. Optional: als Trainer bei Leon (letzte Woche) auf „Entschuldigt“ wechseln, die offene Strafe wird storniert (AK3).
