# Systemstruktur und Datenmodell

## Schichten
Fünf Schichten (Präsentation, Anwendung, Services, Fachlogik, Datenzugriff) mit konkreten Komponenten, siehe [Komponentendiagramm](komponenten.md) und [Namensliste](namensliste.md). Technik: Next.js, Tailwind, Prisma ORM, PostgreSQL (Supabase), mobile-first.

## Kern-Entitäten (Stand 12.11.2026)
- **Team:** Name, Team-Code zum Beitreten, PayPal.me-Name, Demo-Kennzeichen; alle anderen Daten gehören zu genau einem Team
- **User:** Name, Rolle (TRAINER, ASSISTANT, CASHIER, PLAYER, GUARDIAN), Team, Handynummer, Position, Rückennummer, E-Mail, Verknüpfung zum Konto in Supabase Auth (authId), Stellvertreter
- **TrainingSession:** Termin mit Typ (Training, Spiel, Turnier, Feier, Sonstiges), Beginn, Rückmeldefrist, Ort, Treffpunkt, Aufgaben, Notiz, Gegner, abgesagt
- **Attendance:** Status (ATTENDING, EXCUSED, UNSURE, INJURED, UNEXCUSED), Begründung, Aufstellung (Start/Bank, Position)
- **PenaltyRule:** Position im Katalog, Titel, Betrag, Auslöser
- **PenaltyEntry:** Forderung (Strafe, Mahngebühr oder Beitrag), Betrag, bezahlt, Status (PENDING_APPROVAL, OPEN, PARTIAL, PAID_CASH, PAID_PAYPAL, CANCELLED), Fälligkeit
- **CashTransaction:** Einnahme oder Ausgabe im Kassenbuch, storniert
- **AuditLog:** betrifft eine Forderung, eine vom Trainer gesetzte Anwesenheit, eine Kassenbuch-Buchung oder ein Mitglied; alter/neuer Status, geändert von (leer = automatisch), Zeitstempel
- **Announcement, Poll, PollOption, PollVote, ChatMessage:** Ankündigungen, Umfragen und Chat des Teams
- **PushSubscription:** Gerät, das Push-Benachrichtigungen bekommt

Detailliertes Modell seit P3: [ER-Modell](er-modell.md), [Klassendiagramm](klassendiagramm.md), [Komponenten](komponenten.md), [Sequenz REQ-PEN-02](sequenz-pen-02.md), [Architekturbegründung](architekturbegruendung.md), [Namensliste](namensliste.md).
