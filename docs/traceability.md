# Traceability: Feedback → Anforderung → Realisierung → Test

> Stand P3 (28.10.2026). Pre-Traceability (Quelle der Anforderung) siehe [Feedback-Matrix](interviews/feedback-matrix.md).

| REQ | Quelle (Feedback) | Komponente / Klasse | Dateien | Test | Stand P3 |
| --- | --- | --- | --- | --- | --- |
| REQ-SEC-01 Rollen Trainer, Kassenwart, Spieler | alle Interviews | Auth, Server Actions | `src/lib/auth.ts`, `src/app/actions.ts`, Enum `Role` in `prisma/schema.prisma` | manuell: Spieler auf `/trainer` wird umgeleitet | teilweise: Demo-Anmeldung, Trainer und Spieler getrennt |
| REQ-ATT-01 1-Klick-Zu-/Absage | Spieler: „ein Klick auf ‚Bin nicht dabei‘ mit optionalem Grund“ | Spieler-Ansicht, AttendanceService.respond | `src/app/spieler/page.tsx`, `src/services/attendanceService.ts` | manuell (Demo) | teilweise: Rückmeldung fertig, Trainings anlegen folgt |
| REQ-ATT-02 Trainer-Dashboard Anwesenheit | Trainer: Vorlaufzeit, WhatsApp unübersichtlich | Trainer-Dashboard, AttendanceService.getAttendanceList / setByTrainer | `src/app/trainer/**`, `src/services/attendanceService.ts` | manuell (Demo) | teilweise: Liste und Bestätigung fertig, Fehlzeiten-Übersicht folgt |
| REQ-PEN-01 TSVK-Katalog | Artefakt-Analyse TSVK-Strafenkatalog 2026/27 | Entität PenaltyRule | `prisma/schema.prisma`, `prisma/seed.ts` | `tests/penalties.test.ts` | im Datenmodell; Verspätungsbeträge sind Platzhalter |
| REQ-PEN-02 Strafvorschlag mit Bestätigung | Trainer: „erst bestätigen können“ | PenaltyEngine, AuditService, Domain `suggestRuleForAttendance` | `src/services/penaltyEngine.ts`, `src/services/auditService.ts`, `src/domain/penalties.ts`, `src/app/trainer/training/[id]/page.tsx` | `tests/penalties.test.ts`, `tests/penaltyFlow.db.test.ts` (AK1–AK3) | fertig |
| REQ-PEN-03 Kasse mit Zahlungsstatus und Saldo | Kassenwart: bar/PayPal, Teilzahlung | Spieler-Kassenkonto, Domain `balance` | `src/app/spieler/page.tsx`, `src/domain/penalties.ts` | `tests/penalties.test.ts` | teilweise: Spieler-Saldo fertig, Kassenwart-Ansicht und Zahlung verbuchen folgen |

## Umfang P3 und Ausbau zu P4

| P3 (Prototyp, 28.10.) | P4 (11.11.) |
| --- | --- |
| Demo-Anmeldung mit Rollen | Supabase Auth, Kassenwart-Ansicht |
| 1-Klick-Rückmeldung mit optionalem Grund | Trainer legt Trainings selbst an |
| Anwesenheitsliste mit Bestätigung | Fehlzeiten-Übersicht je Spieler |
| Strafvorschlag 20 € mit Freigabe, Verwerfen, Storno, Audit-Log | Zahlungen verbuchen (bar, PayPal, Teilzahlung), Storno durch Kassenwart |
| Spieler-Kassenkonto mit Saldo | Strafenkatalog ansehen und pflegen, Verspätungsstrafen |
