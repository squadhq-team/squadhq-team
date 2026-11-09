# Datenmodell: ER-Diagramm

> Stand 09.11.2026 (Audit-Log-Schutz seit 03.11.2026), entspricht exakt `prisma/schema.prisma`. PK = Primärschlüssel, FK = Fremdschlüssel, UK = eindeutig, „optional“ = darf leer sein (`?` im Schema).

## Übersicht

```mermaid
erDiagram
  USER ||--o{ ATTENDANCE : "meldet"
  TRAINING_SESSION ||--o{ ATTENDANCE : "hat"
  USER ||--o{ TRAINING_SESSION : "erstellt"
  USER ||--o{ PENALTY_ENTRY : "schuldet"
  USER ||--o{ PENALTY_ENTRY : "legt an"
  PENALTY_RULE ||--o{ PENALTY_ENTRY : "Grundlage"
  TRAINING_SESSION |o--o{ PENALTY_ENTRY : "Anlass"
  PENALTY_ENTRY ||--|{ AUDIT_LOG : "Verlauf"
  USER ||--o{ AUDIT_LOG : "Akteur"
```

Dieselben sechs Tabellen und neun Beziehungen wie in der Übersicht des [Klassendiagramms](klassendiagramm.md); Namen siehe [Namensliste](namensliste.md).

## Detailansicht

Alle Tabellen mit Spalten, Schlüsseln und Beziehungen.

```mermaid
erDiagram
  USER ||--o{ ATTENDANCE : "meldet"
  TRAINING_SESSION ||--o{ ATTENDANCE : "hat"
  USER ||--o{ TRAINING_SESSION : "erstellt"
  USER ||--o{ PENALTY_ENTRY : "schuldet"
  USER ||--o{ PENALTY_ENTRY : "legt an"
  PENALTY_RULE ||--o{ PENALTY_ENTRY : "Grundlage"
  TRAINING_SESSION |o--o{ PENALTY_ENTRY : "Anlass"
  PENALTY_ENTRY ||--|{ AUDIT_LOG : "Verlauf"
  USER ||--o{ AUDIT_LOG : "Akteur"

  USER {
    string id PK
    string name
    enum role "TRAINER | CASHIER | PLAYER"
    string phone "optional"
    datetime createdAt
  }
  TRAINING_SESSION {
    string id PK
    string title
    datetime startsAt
    datetime responseDeadline
    string location "optional"
    string createdById FK
    datetime createdAt
  }
  ATTENDANCE {
    string id PK
    string sessionId FK "UK zusammen mit userId"
    string userId FK "UK zusammen mit sessionId"
    enum status "ATTENDING | EXCUSED | UNSURE | UNEXCUSED"
    string note "optional"
    datetime updatedAt
  }
  PENALTY_RULE {
    string id PK
    int position UK "optional, TSVK-Position, z. B. 8"
    string title
    int amountCents
    enum trigger "UNEXCUSED_ABSENCE | LATE | MANUAL"
    boolean active
  }
  PENALTY_ENTRY {
    string id PK
    string playerId FK
    string ruleId FK
    string sessionId FK "optional"
    int amountCents
    int paidCents
    enum status "PENDING_APPROVAL | OPEN | PARTIAL | PAID_CASH | PAID_PAYPAL | CANCELLED"
    enum method "optional: CASH | PAYPAL"
    datetime dueDate "optional"
    string createdById FK
    datetime createdAt
    datetime updatedAt
  }
  AUDIT_LOG {
    string id PK
    string entryId FK
    string actorId FK
    string action "VORGESCHLAGEN | FREIGEGEBEN | VERWORFEN | STORNIERT"
    enum oldStatus "optional, PenaltyStatus"
    enum newStatus "PenaltyStatus"
    string note "optional"
    datetime createdAt
  }
```

## Entscheidungen im Datenmodell

| Entscheidung | Grund (Quelle) |
| --- | --- |
| Beträge als Integer in Cent | keine Rundungsfehler bei Teilzahlungen |
| `PENDING_APPROVAL` als eigener Status | Trainer will erst bestätigen (Interview Trainer) |
| Zahlungsstatus statt Ja/Nein, inkl. `PARTIAL` | bar, PayPal und Teilzahlung (Interview Kassenwart) |
| `CANCELLED` statt Löschen | Storno bleibt nachvollziehbar (Interview Kassenwart, Akzeptanzkriterium 3) |
| `AuditLog` nur anlegen, nie ändern oder löschen; per Datenbank-Trigger erzwungen | wer hat wann was geändert (Interview Kassenwart), manipulationssicher (MVP-6, REQ-AUD-01) |
| jede Strafe hat mindestens einen Protokolleintrag (ER: „eins oder mehr“, Klassendiagramm: `1..*`) | die PenaltyEngine legt Strafe und Eintrag `VORGESCHLAGEN` in derselben Transaktion an; die Datenbank selbst erzwingt das nicht |
| Strafe mit Protokoll nicht löschbar (`onDelete: Restrict`) | Protokoll darf nicht über die Strafe mitgelöscht werden (REQ-AUD-01) |
| eine `Attendance` je Spieler und Training (`@@unique`) | 1-Klick-Rückmeldung überschreibt die alte |
| `note` optional | Absage ohne Rechtfertigungsdruck (Interview Spieler) |

Änderungen gegenüber der P2-Skizze: `PENDING` heißt jetzt `PENDING_APPROVAL`, `PARTIAL` und `CANCELLED` sind ergänzt, der Status `UNEXCUSED_ABSENT` aus der User Story heißt einheitlich `UNEXCUSED`.
