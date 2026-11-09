# Systemstruktur und Datenmodell

## Schichten
Fünf Schichten (Präsentation, Anwendung, Services, Fachlogik, Datenzugriff) mit konkreten Komponenten, siehe [Komponentendiagramm](komponenten.md) und [Namensliste](namensliste.md). Technik: Next.js, Tailwind, Prisma ORM, PostgreSQL (Supabase), mobile-first.

## Kern-Entitäten
- **User:** Name, Rolle (TRAINER, CASHIER, PLAYER), Handynummer, E-Mail und Passwort-Hash (seit P4, Registrierung)
- **TrainingSession:** Datum, Anmelde-Deadline
- **Attendance:** Status (ATTENDING, EXCUSED, UNEXCUSED, UNSURE), Begründung
- **PenaltyRule:** Titel, Standardbetrag
- **PenaltyEntry:** Betrag, Status (PENDING_APPROVAL, OPEN, PARTIAL, PAID_CASH, PAID_PAYPAL, CANCELLED), Fälligkeit
- **AuditLog:** betrifft eine Strafe (alter/neuer Strafstatus) oder eine vom Trainer gesetzte Anwesenheit (alter/neuer Anwesenheitsstatus), geändert von, Zeitstempel

Detailliertes Modell seit P3: [ER-Modell](er-modell.md), [Klassendiagramm](klassendiagramm.md), [Komponenten](komponenten.md), [Sequenz REQ-PEN-02](sequenz-pen-02.md), [Architekturbegründung](architekturbegruendung.md), [Namensliste](namensliste.md).
