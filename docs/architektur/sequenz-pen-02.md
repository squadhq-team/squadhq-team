# Verhalten: Sequenzdiagramm REQ-PEN-02

> Entwurf für P3. Zeigt den Kernablauf der Demo: unentschuldigtes Fehlen → Strafvorschlag → Freigabe → Saldo.

```mermaid
sequenceDiagram
  autonumber
  actor T as Trainer
  participant UI as Trainer-Dashboard
  participant A as Server Actions
  participant AS as AttendanceService
  participant PE as PenaltyEngine
  participant AU as AuditService
  participant DB as PostgreSQL
  participant SP as Spieler-Ansicht
  actor S as Spieler

  T->>UI: Klick "Unentschuldigt" bei Spieler X
  UI->>A: setAttendanceAction(sessionId, playerId, UNEXCUSED)
  A->>A: assertRole(TRAINER)
  A->>AS: setByTrainer(...)
  activate AS
  AS->>DB: BEGIN, upsert Attendance(status=UNEXCUSED)
  AS->>PE: syncPenaltyForAttendance(tx, ...)
  PE->>DB: Regel mit trigger=UNEXCUSED_ABSENCE (TSVK Pos. 8, 20 €)
  PE->>DB: gibt es schon einen offenen Eintrag?
  alt noch keiner vorhanden
    PE->>DB: insert PenaltyEntry(status=PENDING_APPROVAL, 20,00 €)
    PE->>AU: logPenaltyChange(VORGESCHLAGEN)
    AU->>DB: insert AuditLog
  end
  AS->>DB: COMMIT
  deactivate AS
  A-->>UI: revalidate → Vorschlag erscheint

  alt Trainer gibt frei
    T->>UI: Klick "Freigeben"
    UI->>A: approveAction(entryId)
    A->>A: assertRole(TRAINER)
    A->>PE: approvePenalty(entryId, trainerId)
    PE->>DB: update status=OPEN, dueDate=+7 Tage
    PE->>AU: logPenaltyChange(FREIGEGEBEN)
    AU->>DB: insert AuditLog
    A-->>UI: Vorschlag verschwindet
  else Trainer verwirft
    T->>UI: Klick "Verwerfen"
    UI->>A: discardAction(entryId)
    A->>A: assertRole(TRAINER)
    A->>PE: discardPenalty(entryId, trainerId)
    PE->>DB: update status=CANCELLED
    PE->>AU: logPenaltyChange(VERWORFEN)
    AU->>DB: insert AuditLog
    A-->>UI: Vorschlag verschwindet
  end

  S->>SP: öffnet /spieler (Kassenkonto)
  SP->>PE: listPenaltiesForPlayer(playerId)
  PE->>DB: select PenaltyEntry des Spielers
  DB-->>PE: Einträge
  PE-->>SP: Einträge
  SP->>SP: balance(entries) zählt nur OPEN und PARTIAL
  SP-->>S: nach Freigabe Saldo 20,00 €, Status "Offen"

  opt später: Trainer setzt EXCUSED (Strafe bereits freigegeben)
    T->>UI: Klick "Entschuldigt"
    UI->>A: setAttendanceAction(EXCUSED)
    A->>AS: setByTrainer(...)
    AS->>PE: syncPenaltyForAttendance(tx, ...)
    PE->>DB: update status=CANCELLED
    PE->>AU: logPenaltyChange(STORNIERT)
    AU->>DB: insert AuditLog
  end
```

## Zustandsautomat einer Strafe

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
