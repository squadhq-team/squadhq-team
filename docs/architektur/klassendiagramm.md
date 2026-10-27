# Detailentwurf: Klassendiagramm

> Entwurf für P3. Next.js-Services sind als Module mit Funktionen umgesetzt; im Diagramm als Klassen mit statischen Operationen (`<<service>>`) dargestellt. Entitäten entsprechen den Prisma-Modellen in `prisma/schema.prisma`; Fremdschlüssel (z. B. `playerId`) sind als Assoziationen gezeichnet, nicht als Attribute. `?` = optional (darf leer sein).

## Übersicht

```mermaid
classDiagram
  direction LR
  class User
  class TrainingSession
  class Attendance
  class PenaltyRule
  class PenaltyEntry
  class AuditLog

  User "1" -- "0..*" Attendance : meldet
  TrainingSession "1" *-- "0..*" Attendance : hat
  User "1" -- "0..*" PenaltyEntry : schuldet
  PenaltyRule "1" -- "0..*" PenaltyEntry : Grundlage
  TrainingSession "0..1" -- "0..*" PenaltyEntry : Anlass
  PenaltyEntry "1" *-- "1..*" AuditLog : Verlauf
```

Die Übersicht zeigt nur die Fachklassen und ihre Beziehungen; die Services stehen in der Detailansicht und im [Komponentendiagramm](komponenten.md).

## Detailansicht

Alle Attribute, Operationen, Aufzählungstypen und Beziehungen.

```mermaid
classDiagram
  direction LR

  class User {
    +String id
    +String name
    +Role role
    +String? phone
    +DateTime createdAt
  }
  class TrainingSession {
    +String id
    +String title
    +DateTime startsAt
    +DateTime responseDeadline
    +String? location
    +DateTime createdAt
  }
  class Attendance {
    +String id
    +AttendanceStatus status
    +String? note
    +DateTime updatedAt
  }
  class PenaltyRule {
    +String id
    +Int? position
    +String title
    +Int amountCents
    +PenaltyTrigger trigger
    +Boolean active
  }
  class PenaltyEntry {
    +String id
    +Int amountCents
    +Int paidCents
    +PenaltyStatus status
    +PaymentMethod? method
    +DateTime? dueDate
    +DateTime createdAt
    +DateTime updatedAt
  }
  class AuditLog {
    +String id
    +String action
    +PenaltyStatus? oldStatus
    +PenaltyStatus newStatus
    +String? note
    +DateTime createdAt
  }

  class Role {
    <<enumeration>>
    TRAINER
    CASHIER
    PLAYER
  }
  class AttendanceStatus {
    <<enumeration>>
    ATTENDING
    EXCUSED
    UNSURE
    UNEXCUSED
  }
  class PenaltyStatus {
    <<enumeration>>
    PENDING_APPROVAL
    OPEN
    PARTIAL
    PAID_CASH
    PAID_PAYPAL
    CANCELLED
  }
  class PaymentMethod {
    <<enumeration>>
    CASH
    PAYPAL
  }
  class PenaltyTrigger {
    <<enumeration>>
    UNEXCUSED_ABSENCE
    LATE
    MANUAL
  }

  class AttendanceService {
    <<service>>
    +respond(playerId, sessionId, status, note) void
    +setByTrainer(trainerId, sessionId, playerId, status) void
    +listUpcomingForPlayer(playerId) TrainingSession[]
    +listSessions() TrainingSession[]
    +getAttendanceList(sessionId) AttendanceList
  }
  class PenaltyEngine {
    <<service>>
    +syncPenaltyForAttendance(tx, sessionId, playerId, status, actorId) void
    +approvePenalty(entryId, actorId) void
    +discardPenalty(entryId, actorId) void
    +listPenaltiesForPlayer(playerId) PenaltyEntry[]
    +listPendingForSession(sessionId) PenaltyEntry[]
  }
  class AuditService {
    <<service>>
    +logPenaltyChange(tx, entryId, actorId, action, oldStatus, newStatus, note) void
  }
  class PenaltyRules {
    <<domain>>
    +DUE_DAYS = 7
    +PLAYER_CHOICES AttendanceStatus[]
    +suggestRuleForAttendance(status, rules) PenaltyRule
    +isOutstanding(status) Boolean
    +openAmount(entry) Int
    +balance(entries) Int
    +dueDateFrom(date) DateTime
  }
  class Auth {
    <<lib>>
    +getCurrentUser() User
    +requireRole(roles) User
    +assertRole(roles) User
    +homeFor(role) String
    +areasFor(role) Link[]
  }

  User "1" -- "0..*" Attendance : meldet
  TrainingSession "1" *-- "0..*" Attendance : hat
  User "1" -- "0..*" TrainingSession : erstellt
  User "1" -- "0..*" PenaltyEntry : schuldet
  User "1" -- "0..*" PenaltyEntry : legt an
  PenaltyRule "1" -- "0..*" PenaltyEntry : Grundlage
  TrainingSession "0..1" -- "0..*" PenaltyEntry : Anlass
  PenaltyEntry "1" *-- "1..*" AuditLog : Verlauf
  User "1" -- "0..*" AuditLog : Akteur

  AttendanceService ..> PenaltyEngine : nutzt
  AttendanceService ..> PenaltyRules : nutzt
  PenaltyEngine ..> PenaltyRules : nutzt
  PenaltyEngine ..> AuditService : nutzt
  AttendanceService ..> Attendance
  AttendanceService ..> TrainingSession
  PenaltyEngine ..> PenaltyEntry
  AuditService ..> AuditLog
  Auth ..> User
```

Hinweise zum Diagramm:

- Datei der Klasse `PenaltyRules` ist `src/domain/penalties.ts` (reine Funktionen ohne Datenbank), `Auth` ist `src/lib/auth.ts`.
- `AttendanceList` ist das Ergebnis von `getAttendanceList`: das Training und je Spieler des Kaders seine Rückmeldung (oder keine).
- Komposition (gefüllte Raute): Wird ein Training gelöscht, werden seine Rückmeldungen mitgelöscht; wird eine Strafe gelöscht, auch ihr Protokoll (`onDelete: Cascade` im Schema).
- `1..*` bei `AuditLog`: Die Datenbank erlaubt auch 0 Einträge, aber die PenaltyEngine legt jede Strafe zusammen mit dem Protokolleintrag `VORGESCHLAGEN` in derselben Transaktion an. Deshalb hat jede Strafe mindestens einen Eintrag.
