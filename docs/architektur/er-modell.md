# Datenmodell: ER-Diagramm

> Stand Sprint „Features & Design“, 12.11.2026 (Teams mit Team-Code, fünf Rollen, Termine mit Typ, Kasse mit Mahngebühr, Beiträgen und Kassenbuch, Neuigkeiten, Chat, Push), entspricht exakt `prisma/schema.prisma`. PK = Primärschlüssel, FK = Fremdschlüssel, UK = eindeutig, „optional“ = darf leer sein (`?` im Schema).

## Übersicht

```mermaid
erDiagram
  TEAM |o--o{ USER : "Mitglieder"
  TEAM ||--o{ TRAINING_SESSION : "plant"
  TEAM ||--o{ PENALTY_RULE : "Katalog"
  USER ||--o{ ATTENDANCE : "meldet"
  TRAINING_SESSION ||--o{ ATTENDANCE : "hat"
  USER ||--o{ PENALTY_ENTRY : "schuldet"
  PENALTY_RULE |o--o{ PENALTY_ENTRY : "Grundlage"
  TRAINING_SESSION |o--o{ PENALTY_ENTRY : "Anlass"
  PENALTY_ENTRY |o--o{ PENALTY_ENTRY : "Mahngebühr"
  USER ||--o{ CASH_TRANSACTION : "bucht"
  PENALTY_ENTRY |o--|{ AUDIT_LOG : "Verlauf"
  ATTENDANCE |o--o{ AUDIT_LOG : "Anwesenheitsverlauf"
  CASH_TRANSACTION |o--|{ AUDIT_LOG : "Buchungsverlauf"
  USER |o--o{ AUDIT_LOG : "Akteur"
```

Die Übersicht zeigt die acht Kerntabellen mit denselben Beziehungen wie die Übersicht des [Klassendiagramms](klassendiagramm.md); Namen siehe [Namensliste](namensliste.md). Neuigkeiten, Umfragen, Chat und Push-Abos sowie die Team-Zuordnung aller Tabellen stehen in der Detailansicht.

## Detailansicht

Alle 15 Tabellen mit Spalten, Schlüsseln und Beziehungen.

```mermaid
erDiagram
  TEAM |o--o{ USER : "Mitglieder"
  TEAM ||--o{ TRAINING_SESSION : "plant"
  TEAM ||--o{ PENALTY_RULE : "Katalog"
  TEAM ||--o{ PENALTY_ENTRY : "Forderungen"
  TEAM ||--o{ CASH_TRANSACTION : "Kassenbuch"
  TEAM ||--o{ AUDIT_LOG : "Protokoll"
  TEAM ||--o{ ANNOUNCEMENT : "Ankündigungen"
  TEAM ||--o{ POLL : "Umfragen"
  TEAM ||--o{ CHAT_MESSAGE : "Chat"
  USER |o--o{ USER : "Stellvertretung"
  USER ||--o{ ATTENDANCE : "meldet"
  TRAINING_SESSION ||--o{ ATTENDANCE : "hat"
  USER ||--o{ TRAINING_SESSION : "erstellt"
  USER ||--o{ PENALTY_ENTRY : "schuldet"
  USER |o--o{ PENALTY_ENTRY : "legt an"
  PENALTY_RULE |o--o{ PENALTY_ENTRY : "Grundlage"
  TRAINING_SESSION |o--o{ PENALTY_ENTRY : "Anlass"
  PENALTY_ENTRY |o--o{ PENALTY_ENTRY : "Mahngebühr"
  USER ||--o{ CASH_TRANSACTION : "bucht"
  PENALTY_ENTRY |o--|{ AUDIT_LOG : "Verlauf"
  ATTENDANCE |o--o{ AUDIT_LOG : "Anwesenheitsverlauf"
  CASH_TRANSACTION |o--|{ AUDIT_LOG : "Buchungsverlauf"
  USER |o--o{ AUDIT_LOG : "betrifft"
  USER |o--o{ AUDIT_LOG : "Akteur"
  USER ||--o{ ANNOUNCEMENT : "schreibt"
  USER ||--o{ POLL : "fragt"
  POLL ||--|{ POLL_OPTION : "Antworten"
  POLL_OPTION ||--o{ POLL_VOTE : "Stimmen"
  USER ||--o{ POLL_VOTE : "stimmt ab"
  USER ||--o{ CHAT_MESSAGE : "schreibt im Chat"
  USER ||--o{ PUSH_SUBSCRIPTION : "Geräte"

  TEAM {
    string id PK
    string name
    string joinCode UK "Team-Code zum Beitreten"
    string paypalMe "optional, PayPal.me-Name des Kassenwarts"
    boolean isDemo "Demo-Team für Präsentation und Testkonten"
    datetime createdAt
  }
  USER {
    string id PK
    string name
    enum role "TRAINER | ASSISTANT | CASHIER | PLAYER | GUARDIAN"
    string teamId FK "optional, leer = noch in keinem Team"
    string phone "optional"
    string position "optional"
    int shirtNumber "optional"
    string authId UK "optional, Konto in Supabase Auth"
    string email UK "optional"
    string managedById FK "optional, Stellvertreter oder Elternteil"
    boolean emailReminders "Erinnerung per E-Mail, Standard an"
    datetime deletedAt "optional, Konto gelöscht"
    string passwordHash "veraltet, ungenutzt"
    datetime createdAt
  }
  TRAINING_SESSION {
    string id PK
    string teamId FK
    enum type "TRAINING | GAME | TOURNAMENT | PARTY | OTHER"
    string title
    datetime startsAt
    datetime responseDeadline
    string location "optional"
    string meetingPoint "optional"
    datetime meetingAt "optional"
    string tasks "optional"
    string notes "optional"
    string opponent "optional"
    datetime cancelledAt "optional, abgesagt"
    string importUid "optional, UK zusammen mit teamId"
    string createdById FK
    datetime createdAt
    datetime updatedAt
  }
  ATTENDANCE {
    string id PK
    string sessionId FK "UK zusammen mit userId"
    string userId FK "UK zusammen mit sessionId"
    enum status "ATTENDING | EXCUSED | UNSURE | INJURED | UNEXCUSED"
    string note "optional"
    enum lineup "optional: STARTER | BENCH"
    string lineupPosition "optional"
    datetime updatedAt
  }
  PENALTY_RULE {
    string id PK
    string teamId FK
    int position "optional, TSVK-Position, UK zusammen mit teamId"
    string title
    int amountCents
    enum trigger "UNEXCUSED_ABSENCE | UNEXCUSED_GAME | LATE | LATE_FEE | MANUAL"
    boolean active
  }
  PENALTY_ENTRY {
    string id PK
    string teamId FK
    enum kind "PENALTY | LATE_FEE | FEE"
    string playerId FK
    string ruleId FK "optional"
    string sessionId FK "optional"
    string title "optional, bei Beitrag und Mahngebühr"
    int quantity
    string note "optional"
    int amountCents
    int paidCents
    enum status "PENDING_APPROVAL | OPEN | PARTIAL | PAID_CASH | PAID_PAYPAL | CANCELLED"
    enum method "optional: CASH | PAYPAL"
    datetime dueDate "optional"
    string parentId FK "optional, Strafe zur Mahngebühr"
    int lateFeeWeek "optional, UK zusammen mit parentId"
    string createdById FK "optional, leer = automatisch"
    datetime createdAt
    datetime updatedAt
  }
  CASH_TRANSACTION {
    string id PK
    string teamId FK
    enum direction "INCOME | EXPENSE"
    int amountCents
    string description
    datetime bookedAt
    string createdById FK
    datetime cancelledAt "optional, storniert"
    datetime createdAt
  }
  AUDIT_LOG {
    string id PK
    string teamId FK
    string entryId FK "optional, Forderung"
    string attendanceId FK "optional, Anwesenheit"
    string transactionId FK "optional, Kassenbuch"
    string subjectId FK "optional, Mitglied"
    string actorId FK "optional, leer = automatisch"
    string action "z. B. VORGESCHLAGEN, FREIGEGEBEN, BEZAHLT, MAHNGEBUEHR, ROLLE_GEAENDERT"
    enum oldStatus "optional, PenaltyStatus"
    enum newStatus "optional, PenaltyStatus"
    enum oldAttendance "optional, AttendanceStatus"
    enum newAttendance "optional, AttendanceStatus"
    string note "optional"
    datetime createdAt
  }
  ANNOUNCEMENT {
    string id PK
    string teamId FK
    string authorId FK
    string title
    string body
    boolean pinned
    datetime createdAt
  }
  POLL {
    string id PK
    string teamId FK
    string createdById FK
    string question
    boolean multiple
    datetime closesAt "optional"
    datetime closedAt "optional"
    datetime createdAt
  }
  POLL_OPTION {
    string id PK
    string pollId FK
    string text
    int order
  }
  POLL_VOTE {
    string id PK
    string optionId FK "UK zusammen mit userId"
    string userId FK "UK zusammen mit optionId"
    datetime createdAt
  }
  CHAT_MESSAGE {
    string id PK
    string teamId FK
    string authorId FK
    string body
    datetime createdAt
  }
  PUSH_SUBSCRIPTION {
    string id PK
    string userId FK
    string endpoint UK
    string p256dh
    string auth
    datetime createdAt
  }
```

## Entscheidungen im Datenmodell

| Entscheidung | Grund (Quelle) |
| --- | --- |
| Jede Fachtabelle hängt über `teamId` an genau einem `Team`, jede Abfrage filtert danach | mehrere Vereine und Mannschaften in einer App, Daten bleiben getrennt (Sprint „Features & Design“, Vorbild SpielerPlus) |
| Beitreten per `joinCode` (6 Zeichen ohne 0/O, 1/I/L), Demo-Team (`isDemo`) nicht beitretbar | einfach weiterzugeben (WhatsApp), keine Verwechslung beim Abtippen; Präsentationsdaten bleiben von echten Teams getrennt |
| Rolle am `User`, je Person ein Team | ein Konto gehört zu einer Mannschaft; Rechte je Rolle in `src/domain/permissions.ts` (REQ-SEC-01) |
| `managedById` (Stellvertretung) | Eltern oder Betreuer sagen für Jugendliche oder Mitglieder ohne Konto zu und ab |
| `emailReminders` (Standard an) | Erinnerung vor der Rückmeldefrist auch per E-Mail (#26), jede Person kann sie im Profil abschalten |
| Konto löschen setzt `deletedAt` und leert Name und Kontakt | Datenschutz; Forderungen und Protokoll bleiben anonym nachvollziehbar |
| Beträge als Integer in Cent | keine Rundungsfehler bei Teilzahlungen |
| `PENDING_APPROVAL` als eigener Status | Trainer will erst bestätigen (Interview Trainer) |
| Zahlungsstatus statt Ja/Nein, inkl. `PARTIAL` | bar, PayPal und Teilzahlung (Interview Kassenwart) |
| `CANCELLED` statt Löschen, auch bei Kassenbuch-Buchungen (`cancelledAt`) | Storno bleibt nachvollziehbar (Interview Kassenwart, Akzeptanzkriterium 3) |
| Strafen, Mahngebühren und Beiträge in einer Tabelle (`kind`) | alle Forderungen erscheinen gleich im Kassenkonto und werden gleich bezahlt |
| Mahngebühr verweist auf ihre Strafe (`parentId`), eindeutig je Strafe und Woche | automatische Mahngebühr 5 € je angefangene Woche (Strafenkatalog TSVK), keine doppelte Buchung bei gleichzeitigen Aufrufen |
| Einnahmen und Ausgaben als eigene Tabelle `CashTransaction` | Kassenstand = eingenommene Forderungen + Einnahmen − Ausgaben (Kassenwart) |
| `AuditLog` nur anlegen, nie ändern oder löschen; per Datenbank-Trigger erzwungen | wer hat wann was geändert (Interview Kassenwart), manipulationssicher (MVP-6, REQ-AUD-01) |
| jede Forderung und jede Buchung hat mindestens einen Protokolleintrag (ER: „eins oder mehr“, Klassendiagramm: `1..*`) | die Services legen Forderung bzw. Buchung und Protokolleintrag in derselben Transaktion an; die Datenbank selbst erzwingt das nicht |
| Forderung, Anwesenheit, Buchung und Mitglied mit Protokoll nicht löschbar (`onDelete: Restrict`) | Protokoll darf nicht mitgelöscht werden (REQ-AUD-01) |
| `AuditLog` betrifft genau eins: Forderung, Anwesenheit, Buchung **oder** Mitglied (CHECK `audit_log_genau_ein_bezug`) | Trainer-Änderungen an der Anwesenheit, Kassenbuch und Rollen kommen ins Protokoll, normale Spieler-Klicks nicht (Entscheidung Team 03.11.) |
| `actorId` optional | automatische Buchungen (Mahngebühr) und gelöschte Konten haben keinen Bearbeiter |
| Zahlungen ohne eigene Tabelle: `paidCents` + `method` an der Forderung, jede Zahlung als Protokolleintrag mit Betrag | reicht für bar, PayPal und Teilzahlung (MVP-5), jede Buchung bleibt nachvollziehbar |
| Passwörter nur bei Supabase Auth, `User.authId` verknüpft das Konto (ohne Fremdschlüssel, weil `auth.users` in einem anderen Schema liegt) | Registrierung, Passwort vergessen, sichere Sitzungen ohne eigene Passwort-Speicherung; im Demo-Team haben nur die drei Testkonten ein Konto |
| Row Level Security auf allen Tabellen, ohne Freigabe-Regeln (`prisma/zugriffsschutz.ts`) | Tabellen sind nicht über die REST-Schnittstelle von Supabase erreichbar; Prisma als Eigentümer ist nicht betroffen |
| eine `Attendance` je Mitglied und Termin (`@@unique`) | 1-Klick-Rückmeldung überschreibt die alte |
| `note` optional | Absage ohne Rechtfertigungsdruck (Interview Spieler) |
| `importUid` eindeutig je Team | erneuter Spielplan-Import aktualisiert Termine statt sie doppelt anzulegen |

Änderungen gegenüber der P2-Skizze: `PENDING` heißt jetzt `PENDING_APPROVAL`, `PARTIAL` und `CANCELLED` sind ergänzt, der Status `UNEXCUSED_ABSENT` aus der User Story heißt einheitlich `UNEXCUSED`.
