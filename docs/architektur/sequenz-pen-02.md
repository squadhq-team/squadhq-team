# Verhalten: Sequenzdiagramm REQ-PEN-02

> Zeigt den Kernablauf: unentschuldigtes Fehlen → Strafvorschlag → Freigabe → Saldo. Seit dem P3-Feedback (09.11.2026) heißen die Teilnehmer genauso wie die Komponenten im [Komponentendiagramm](komponenten.md) (siehe [Namensliste](namensliste.md)); die Übersicht zeigt dieselben Komponenten wie die Detailansicht, nur ohne Funktionsnamen.

## Übersicht

```mermaid
sequenceDiagram
  actor T as Trainer
  participant TD as Trainer-Dashboard
  participant ACT as Eingaben verarbeiten
  participant ATT as Zu-/Absagen & Anwesenheit
  participant PEN as Strafen vorschlagen & freigeben
  participant AUD as Protokollierung
  participant DB as Datenbank
  participant SP as Spieler-Ansicht
  actor S as Spieler

  T->>TD: markiert Spieler als „Unentschuldigt“
  TD->>ACT: Formular senden
  ACT->>ATT: Anwesenheit setzen
  ATT->>DB: Anwesenheit speichern
  ATT->>PEN: Strafe abgleichen
  PEN->>DB: Strafvorschlag 20 € anlegen (wartet auf Freigabe)
  PEN->>AUD: „vorgeschlagen“ protokollieren
  TD-->>T: Vorschlag wird angezeigt
  T->>TD: gibt Strafe frei
  TD->>ACT: Formular senden
  ACT->>PEN: Strafe freigeben
  PEN->>DB: Strafe offen, fällig in 7 Tagen
  PEN->>AUD: „freigegeben“ protokollieren
  S->>SP: öffnet sein Kassenkonto
  SP->>PEN: Kassenkonto lesen
  PEN->>DB: Strafen lesen
  SP-->>S: Saldo 20,00 €
```

## Detailansicht

Derselbe Ablauf mit allen Komponenten und Funktionsaufrufen, inklusive „Verwerfen“ und späterer Stornierung. Die Protokollierung schreibt jeden Eintrag in dieselbe Transaktion wie die Statusänderung.

```mermaid
sequenceDiagram
  autonumber
  actor T as Trainer
  participant TD as Trainer-Dashboard
  participant ACT as Eingaben verarbeiten<br/>(Server Actions)
  participant AUTH as Einloggen & Rollenprüfung<br/>(Auth)
  participant ATT as Zu-/Absagen & Anwesenheit<br/>(AttendanceService)
  participant PEN as Strafen vorschlagen & freigeben<br/>(PenaltyEngine)
  participant RULES as Regelverwaltung<br/>(Penalties)
  participant AUD as Protokollierung<br/>(AuditService)
  participant DB as Datenbank<br/>(PostgreSQL)
  participant SP as Spieler-Ansicht
  actor S as Spieler

  T->>TD: Klick „Unentschuldigt“ bei Spieler X
  TD->>ACT: setAttendanceAction(sessionId, playerId, UNEXCUSED)
  ACT->>AUTH: assertRole(TRAINER)
  ACT->>ATT: setByTrainer(...)
  activate ATT
  ATT->>DB: BEGIN, upsert Attendance(status=UNEXCUSED)
  ATT->>PEN: syncPenaltyForAttendance(tx, ...)
  PEN->>DB: Regeln mit trigger=UNEXCUSED_ABSENCE lesen
  PEN->>RULES: suggestRuleForAttendance() → TSVK Pos. 8, 20 €
  PEN->>DB: gibt es schon einen offenen Eintrag?
  alt noch keiner vorhanden
    PEN->>DB: insert PenaltyEntry(status=PENDING_APPROVAL, 20,00 €)
    PEN->>AUD: logPenaltyChange(VORGESCHLAGEN)
    AUD->>DB: insert AuditLog
  end
  ATT->>DB: COMMIT
  deactivate ATT
  ACT-->>TD: revalidatePath → Vorschlag erscheint

  alt Trainer gibt frei
    T->>TD: Klick „Freigeben“
    TD->>ACT: approveAction(entryId)
    ACT->>AUTH: assertRole(TRAINER)
    ACT->>PEN: approvePenalty(entryId, trainerId)
    PEN->>RULES: dueDateFrom(heute) → +7 Tage
    PEN->>DB: update status=OPEN, dueDate
    PEN->>AUD: logPenaltyChange(FREIGEGEBEN)
    AUD->>DB: insert AuditLog
    ACT-->>TD: Vorschlag verschwindet
  else Trainer verwirft
    T->>TD: Klick „Verwerfen“
    TD->>ACT: discardAction(entryId)
    ACT->>AUTH: assertRole(TRAINER)
    ACT->>PEN: discardPenalty(entryId, trainerId)
    PEN->>DB: update status=CANCELLED
    PEN->>AUD: logPenaltyChange(VERWORFEN)
    AUD->>DB: insert AuditLog
    ACT-->>TD: Vorschlag verschwindet
  end

  S->>SP: öffnet /spieler (Kassenkonto)
  SP->>AUTH: requireRole(PLAYER)
  SP->>PEN: getPlayerAccount(playerId)
  PEN->>DB: select PenaltyEntry des Spielers
  DB-->>PEN: Einträge
  PEN->>RULES: balance(entries) zählt nur OPEN und PARTIAL
  PEN-->>SP: Saldo und sichtbare Einträge
  SP-->>S: nach Freigabe Saldo 20,00 €, Status „Offen“

  opt später: Trainer setzt „Entschuldigt“ (Strafe bereits freigegeben)
    T->>TD: Klick „Entschuldigt“
    TD->>ACT: setAttendanceAction(EXCUSED)
    ACT->>AUTH: assertRole(TRAINER)
    ACT->>ATT: setByTrainer(...)
    ATT->>PEN: syncPenaltyForAttendance(tx, ...)
    PEN->>DB: update status=CANCELLED
    PEN->>AUD: logPenaltyChange(STORNIERT)
    AUD->>DB: insert AuditLog
  end
```

## Zustandsautomat einer Strafe

### Übersicht

```mermaid
stateDiagram-v2
  state "PAID_CASH / PAID_PAYPAL" as PAID
  [*] --> PENDING_APPROVAL: Trainer setzt UNEXCUSED
  PENDING_APPROVAL --> OPEN: Trainer gibt frei
  OPEN --> PARTIAL: Teilzahlung
  OPEN --> PAID: bezahlt
  PARTIAL --> PAID: Rest bezahlt
  PENDING_APPROVAL --> CANCELLED: verworfen
  OPEN --> CANCELLED: storniert
  PARTIAL --> CANCELLED: storniert
  PAID --> [*]
  CANCELLED --> [*]
```

### Detailansicht

```mermaid
stateDiagram-v2
  [*] --> PENDING_APPROVAL: Trainer setzt UNEXCUSED
  PENDING_APPROVAL --> OPEN: Trainer gibt frei
  PENDING_APPROVAL --> CANCELLED: Trainer verwirft / Status nicht mehr UNEXCUSED
  OPEN --> PARTIAL: Teilzahlung (P4)
  OPEN --> PAID_CASH: bar bezahlt (P4)
  OPEN --> PAID_PAYPAL: PayPal (P4)
  PARTIAL --> PARTIAL: weitere Teilzahlung (P4)
  PARTIAL --> PAID_CASH: Rest bar bezahlt (P4)
  PARTIAL --> PAID_PAYPAL: Rest per PayPal (P4)
  OPEN --> CANCELLED: Status nachträglich nicht mehr UNEXCUSED
  PARTIAL --> CANCELLED: Status nachträglich nicht mehr UNEXCUSED
  PAID_CASH --> [*]
  PAID_PAYPAL --> [*]
  CANCELLED --> [*]
```

Im Saldo zählen nur `OPEN` und `PARTIAL` (Funktion `isOutstanding` in `src/domain/penalties.ts`). Jeder Zustandswechsel wird im `AuditLog` protokolliert. Übergänge mit „(P4)“ sind modelliert, aber erst zu P4 umgesetzt.
