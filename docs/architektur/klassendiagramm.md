# Detailentwurf: Klassendiagramm

> Entwurf für P3. Next.js-Services sind als Module mit Funktionen umgesetzt; im Diagramm als Klassen mit statischen Operationen (`<<service>>`) dargestellt. Entitäten entsprechen den Prisma-Modellen.

```mermaid
classDiagram
  direction LR

  class User {
    +String id
    +String name
    +Role role
    +String phone
  }
  class TrainingSession {
    +String id
    +String title
    +DateTime startsAt
    +DateTime responseDeadline
    +String location
  }
  class Attendance {
    +String id
    +AttendanceStatus status
    +String note
  }
  class PenaltyRule {
    +String id
    +Int position
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
    +PaymentMethod method
    +DateTime dueDate
  }
  class AuditLog {
    +String id
    +String action
    +PenaltyStatus oldStatus
    +PenaltyStatus newStatus
    +DateTime createdAt
  }

  class AttendanceService {
    <<service>>
    +respond(playerId, sessionId, status, note) void
    +setByTrainer(trainerId, sessionId, playerId, status) void
    +listUpcomingForPlayer(playerId) TrainingSession[]
    +listSessions() TrainingSession[]
    +getAttendanceList(sessionId) Row[]
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
    +logPenaltyChange(tx, entryId, actorId, action, oldStatus, newStatus) void
  }
  class PenaltyRules {
    <<domain>>
    +suggestRuleForAttendance(status, rules) PenaltyRule
    +balance(entries) Int
    +openAmount(entry) Int
    +dueDateFrom(date) DateTime
  }
  class Auth {
    <<lib>>
    +getCurrentUser() User
    +requireRole(roles) User
    +assertRole(roles) User
  }

  User "1" -- "0..*" Attendance : meldet
  TrainingSession "1" -- "0..*" Attendance : hat
  User "1" -- "0..*" TrainingSession : erstellt
  User "1" -- "0..*" PenaltyEntry : schuldet
  PenaltyRule "1" -- "0..*" PenaltyEntry : Grundlage
  TrainingSession "0..1" -- "0..*" PenaltyEntry : Anlass
  PenaltyEntry "1" *-- "1..*" AuditLog : Verlauf
  User "1" -- "0..*" AuditLog : Akteur

  AttendanceService ..> PenaltyEngine : nutzt
  AttendanceService ..> PenaltyRules : nutzt
  PenaltyEngine ..> PenaltyRules : nutzt
  PenaltyEngine ..> AuditService : nutzt
  AttendanceService ..> Attendance
  PenaltyEngine ..> PenaltyEntry
  AuditService ..> AuditLog
```

Aufzählungstypen: `Role {TRAINER, CASHIER, PLAYER}`, `AttendanceStatus {ATTENDING, EXCUSED, UNSURE, UNEXCUSED}`, `PenaltyStatus {PENDING_APPROVAL, OPEN, PARTIAL, PAID_CASH, PAID_PAYPAL, CANCELLED}`, `PaymentMethod {CASH, PAYPAL}`, `PenaltyTrigger {UNEXCUSED_ABSENCE, LATE, MANUAL}`.
