# Systemstruktur und Datenmodell

## Schichten
- **Frontend:** Next.js, Tailwind, shadcn/ui, mobile-first
- **Backend:** Server Actions mit AttendanceService, PenaltyEngine, AuditService
- **Datenbank:** PostgreSQL (Supabase) über Prisma ORM

## Kern-Entitäten
- **User:** Name, Rolle (TRAINER, CASHIER, PLAYER), Handynummer
- **TrainingSession:** Datum, Anmelde-Deadline
- **Attendance:** Status (ATTENDING, EXCUSED, UNEXCUSED, UNSURE), Begründung
- **PenaltyRule:** Titel, Standardbetrag
- **PenaltyEntry:** Betrag, Status (PENDING, OPEN, PAID_CASH, PAID_PAYPAL), Fälligkeit
- **AuditLog:** EntryID, geändert von, alter Status, neuer Status, Zeitstempel

Detailliertes ER-Modell und Klassendiagramm folgen zu P3.
