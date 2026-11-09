# Detailentwurf: Klassendiagramm

> Überarbeitet nach dem P3-Feedback (09.11.2026). **Next.js kennt hier keine Klassen:** Der Code besteht aus Prisma-Modellen (reine Daten) und TypeScript-Modulen (Dateien mit Funktionen). Das Diagramm unterscheidet beides deshalb ausdrücklich:
>
> - `«Prisma-Modell»` = Modell in `prisma/schema.prisma`, Attribute = Spalten, keine Methoden. Fremdschlüssel (z. B. `playerId`) sind als Assoziationen gezeichnet, nicht als Attribute.
> - `«Modul»` = TypeScript-Datei; jede Operation ist eine exportierte Funktion. Der Klassenname ist der Codename aus dem [Komponentendiagramm](komponenten.md) (siehe [Namensliste](namensliste.md)).
> - `«enumeration»` = `enum` im Prisma-Schema. `?` = optional (darf leer sein).

## Übersicht

```mermaid
classDiagram
  direction LR
  class User {
    <<Prisma-Modell>>
  }
  class TrainingSession {
    <<Prisma-Modell>>
  }
  class Attendance {
    <<Prisma-Modell>>
  }
  class PenaltyRule {
    <<Prisma-Modell>>
  }
  class PenaltyEntry {
    <<Prisma-Modell>>
  }
  class AuditLog {
    <<Prisma-Modell>>
  }

  User "1" -- "0..*" Attendance : meldet
  TrainingSession "1" *-- "0..*" Attendance : hat
  User "1" -- "0..*" TrainingSession : erstellt
  User "1" -- "0..*" PenaltyEntry : schuldet
  User "1" -- "0..*" PenaltyEntry : legt an
  PenaltyRule "1" -- "0..*" PenaltyEntry : Grundlage
  TrainingSession "0..1" -- "0..*" PenaltyEntry : Anlass
  PenaltyEntry "0..1" -- "1..*" AuditLog : Verlauf
  Attendance "0..1" -- "0..*" AuditLog : Anwesenheitsverlauf
  User "1" -- "0..*" AuditLog : Akteur
```

Die Übersicht zeigt die sechs Prisma-Modelle mit denselben zehn Beziehungen wie die Übersicht des [ER-Modells](er-modell.md); die Module stehen in der Detailansicht und im [Komponentendiagramm](komponenten.md).

## Detailansicht

Alle Attribute, Operationen, Aufzählungstypen und Beziehungen.

```mermaid
classDiagram
  direction LR

  class User {
    <<Prisma-Modell>>
    +String id
    +String name
    +Role role
    +String? phone
    +String? email
    +String? passwordHash
    +DateTime createdAt
  }
  class TrainingSession {
    <<Prisma-Modell>>
    +String id
    +String title
    +DateTime startsAt
    +DateTime responseDeadline
    +String? location
    +DateTime createdAt
  }
  class Attendance {
    <<Prisma-Modell>>
    +String id
    +AttendanceStatus status
    +String? note
    +DateTime updatedAt
  }
  class PenaltyRule {
    <<Prisma-Modell>>
    +String id
    +Int? position
    +String title
    +Int amountCents
    +PenaltyTrigger trigger
    +Boolean active
  }
  class PenaltyEntry {
    <<Prisma-Modell>>
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
    <<Prisma-Modell>>
    +String id
    +String action
    +PenaltyStatus? oldStatus
    +PenaltyStatus? newStatus
    +AttendanceStatus? oldAttendance
    +AttendanceStatus? newAttendance
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

  class ServerActions {
    <<Modul>>
    +login(formData) void
    +loginWithPassword(formData) void
    +registerAction(formData) void
    +logout() void
    +respondAction(formData) void
    +createSessionAction(formData) void
    +setAttendanceAction(formData) void
    +approveAction(formData) void
    +discardAction(formData) void
    +payAction(formData) void
  }
  class Auth {
    <<Modul>>
    +listLoginUsers() User[]
    +signIn(userId) User
    +signInWithPassword(email, password) User
    +startSession(user) User
    +signOut() void
    +getCurrentUser() User?
    +requireRole(roles) User
    +assertRole(roles) User
    +homeFor(role) String
    +areasFor(role) Link[]
  }
  class AttendanceService {
    <<Modul>>
    +respond(playerId, sessionId, status, note) void
    +setByTrainer(trainerId, sessionId, playerId, status) void
    +createSession(trainerId, title, startsAt, responseDeadline, location) TrainingSession
    +listUpcomingForPlayer(playerId) TrainingSession[]
    +listSessions() TrainingSession[]
    +getAttendanceList(sessionId) AttendanceList
  }
  class PenaltyEngine {
    <<Modul>>
    +syncPenaltyForAttendance(tx, sessionId, playerId, status, actorId) void
    +approvePenalty(entryId, actorId) void
    +discardPenalty(entryId, actorId) void
    +listPenaltiesForPlayer(playerId) PenaltyEntry[]
    +getPlayerAccount(playerId) PlayerAccount
    +listPendingForSession(sessionId) PenaltyEntry[]
  }
  class AuditService {
    <<Modul>>
    +logPenaltyChange(tx, entryId, actorId, action, oldStatus, newStatus, note) void
    +logAttendanceChange(tx, attendanceId, actorId, oldAttendance, newAttendance) void
    +listAuditLog(limit) AuditLog[]
  }
  class PaymentService {
    <<Modul>>
    +recordPayment(entryId, actorId, method, amountCents) void
    +getTeamCash(now) TeamCash
  }
  class Registration {
    <<Modul>>
    +validateRegistration(input) String?
    +registerUser(input) User
  }
  class Penalties {
    <<Modul>>
    +DUE_DAYS = 7
    +PLAYER_CHOICES AttendanceStatus[]
    +suggestRuleForAttendance(status, rules) PenaltyRule?
    +isOutstanding(status) Boolean
    +openAmount(entry) Int
    +balance(entries) Int
    +dueDateFrom(date) DateTime
    +LATE_FEE_CENTS_PER_WEEK = 500
    +applyPayment(entry, method, amountCents) PaymentResult
    +isOverdue(entry, now) Boolean
    +weeksOverdue(entry, now) Int
  }

  User "1" -- "0..*" Attendance : meldet
  TrainingSession "1" *-- "0..*" Attendance : hat
  User "1" -- "0..*" TrainingSession : erstellt
  User "1" -- "0..*" PenaltyEntry : schuldet
  User "1" -- "0..*" PenaltyEntry : legt an
  PenaltyRule "1" -- "0..*" PenaltyEntry : Grundlage
  TrainingSession "0..1" -- "0..*" PenaltyEntry : Anlass
  PenaltyEntry "0..1" -- "1..*" AuditLog : Verlauf
  Attendance "0..1" -- "0..*" AuditLog : Anwesenheitsverlauf
  User "1" -- "0..*" AuditLog : Akteur

  ServerActions ..> Auth : nutzt
  ServerActions ..> AttendanceService : nutzt
  ServerActions ..> PenaltyEngine : nutzt
  ServerActions ..> PaymentService : nutzt
  ServerActions ..> Registration : nutzt
  AttendanceService ..> PenaltyEngine : nutzt
  AttendanceService ..> AuditService : nutzt
  PaymentService ..> Penalties : nutzt
  PaymentService ..> AuditService : nutzt
  AttendanceService ..> Penalties : nutzt
  PenaltyEngine ..> Penalties : nutzt
  PenaltyEngine ..> AuditService : nutzt
  AttendanceService ..> Attendance
  AttendanceService ..> TrainingSession
  PenaltyEngine ..> PenaltyEntry
  AuditService ..> AuditLog
  PaymentService ..> PenaltyEntry
  Registration ..> User
  Auth ..> User
```

Hinweise zum Diagramm:

- Dateien der Module: `ServerActions` = `src/app/actions.ts`, `Auth` = `src/lib/auth.ts`, `Registration` = `src/lib/registration.ts` (Passwort-Hash mit `src/lib/password.ts`), `AttendanceService`, `PenaltyEngine`, `AuditService`, `PaymentService` = `src/services/…`, `Penalties` = `src/domain/penalties.ts` (Regelverwaltung, reine Funktionen ohne Datenbank).
- Die Abhängigkeiten (gestrichelte Pfeile) zeigen nur nach unten, genau wie im Komponentendiagramm: Server Actions → Services → Regelverwaltung. Die Seiten (Präsentation) sind keine Module mit Operationen und stehen deshalb nur im Komponentendiagramm.
- `AttendanceList` ist das Ergebnis von `getAttendanceList`: das Training und je Spieler des Kaders seine Rückmeldung (oder keine). `PlayerAccount` ist das Ergebnis von `getPlayerAccount`: Saldo in Cent und die sichtbaren Strafen. `TeamCash` ist das Ergebnis von `getTeamCash`: offene Strafen (mit überfällig und Mahngebühr), bezahlte Strafen, Summen und offene Beträge je Spieler. `PaymentResult` ist der neue Zustand nach einer Zahlung (Status, bezahlter Betrag).
- Komposition (gefüllte Raute): Wird ein Training gelöscht, werden seine Rückmeldungen mitgelöscht (`onDelete: Cascade` im Schema).
- `PenaltyEntry` und `AuditLog` sind bewusst nur assoziiert, nicht komponiert: Das Protokoll ist manipulationssicher (REQ-AUD-01). Eine Strafe mit Protokoll lässt sich nicht löschen (`onDelete: Restrict`), nur stornieren (`CANCELLED`); Protokolleinträge selbst lehnt die Datenbank beim Ändern und Löschen ab (Trigger, `prisma/auditLogSchutz.ts`).
- Ein `AuditLog`-Eintrag betrifft genau eine Sache: eine Strafe (`Verlauf`) **oder** eine vom Trainer gesetzte Anwesenheit (`Anwesenheitsverlauf`). Deshalb `0..1` auf beiden Seiten; die Datenbank erzwingt „genau eins von beiden“ per CHECK-Bedingung (`prisma/auditLogSchutz.ts`). Normale Spieler-Rückmeldungen werden nicht protokolliert.
- `1..*` bei `AuditLog`: Die Datenbank erlaubt auch 0 Einträge, aber die PenaltyEngine legt jede Strafe zusammen mit dem Protokolleintrag `VORGESCHLAGEN` in derselben Transaktion an. Deshalb hat jede Strafe mindestens einen Eintrag.
