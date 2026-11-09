# Verhalten: Sequenzdiagramm REQ-PEN-02

> Zeigt den Kernablauf: unentschuldigtes Fehlen → Strafvorschlag → Freigabe → Saldo, dazu seit P4 die Zahlung beim Kassenwart (eigener Abschnitt unten). Seit dem P3-Feedback (09.11.2026) heißen die Teilnehmer genauso wie die Komponenten im [Komponentendiagramm](komponenten.md) (siehe [Namensliste](namensliste.md)); die Übersicht zeigt dieselben Komponenten wie die Detailansicht, nur ohne Funktionsnamen.

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
  ATT->>AUD: Anwesenheit protokollieren
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
  ATT->>DB: BEGIN, alten Status lesen, upsert Attendance(status=UNEXCUSED)
  opt Status hat sich geändert
    ATT->>AUD: logAttendanceChange(alt → UNEXCUSED)
    AUD->>DB: insert AuditLog (attendanceId)
  end
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

## Sequenzdiagramm Zahlung verbuchen (REQ-PEN-04, MVP-5)

Der Kassenwart verbucht eine freigegebene Strafe mit einem Klick als bar oder per PayPal bezahlt. Mit Betrag wird eine Teilzahlung verbucht.

```mermaid
sequenceDiagram
  autonumber
  actor K as Kassenwart
  participant KW as Kassenwart-Ansicht
  participant ACT as Eingaben verarbeiten<br/>(Server Actions)
  participant AUTH as Einloggen & Rollenprüfung<br/>(Auth)
  participant PAY as Zahlungen verbuchen<br/>(PaymentService)
  participant RULES as Regelverwaltung<br/>(Penalties)
  participant AUD as Protokollierung<br/>(AuditService)
  participant DB as Datenbank<br/>(PostgreSQL)

  K->>KW: öffnet /kasse
  KW->>AUTH: requireRole(CASHIER, TRAINER)
  KW->>PAY: getTeamCash()
  PAY->>DB: freigegebene Strafen lesen
  PAY->>RULES: openAmount(), isOverdue(), weeksOverdue()
  PAY-->>KW: offene (überfällige zuerst) und bezahlte Strafen, Summen
  K->>KW: Klick „Bezahlt (bar)“
  KW->>ACT: payAction(entryId, CASH)
  ACT->>AUTH: assertRole(CASHIER)
  ACT->>PAY: recordPayment(entryId, kassenwartId, CASH)
  activate PAY
  PAY->>DB: BEGIN, Strafe lesen
  PAY->>RULES: applyPayment(entry, CASH) → PAID_CASH
  PAY->>DB: update status, paidCents, method
  PAY->>AUD: logPenaltyChange(BEZAHLT, „20,00 € bar“)
  AUD->>DB: insert AuditLog
  PAY->>DB: COMMIT
  deactivate PAY
  ACT-->>KW: Strafe wandert zu „Bezahlte Strafen“
```

## Zustandsautomat einer Strafe

### Übersicht

```mermaid
stateDiagram-v2
  state "PAID_CASH / PAID_PAYPAL" as PAID
  [*] --> PENDING_APPROVAL: Trainer setzt UNEXCUSED
  PENDING_APPROVAL --> OPEN: Trainer gibt frei
  OPEN --> PARTIAL: Kassenwart verbucht Teilzahlung
  OPEN --> PAID: Kassenwart verbucht Zahlung
  PARTIAL --> PAID: Kassenwart verbucht Rest
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
  OPEN --> PARTIAL: Kassenwart verbucht Teilzahlung
  OPEN --> PAID_CASH: Kassenwart verbucht bar
  OPEN --> PAID_PAYPAL: Kassenwart verbucht PayPal
  PARTIAL --> PARTIAL: weitere Teilzahlung
  PARTIAL --> PAID_CASH: Rest bar bezahlt
  PARTIAL --> PAID_PAYPAL: Rest per PayPal
  OPEN --> CANCELLED: Status nachträglich nicht mehr UNEXCUSED
  PARTIAL --> CANCELLED: Status nachträglich nicht mehr UNEXCUSED
  PAID_CASH --> [*]
  PAID_PAYPAL --> [*]
  CANCELLED --> [*]
```

Im Saldo zählen nur `OPEN` und `PARTIAL` (Funktion `isOutstanding` in `src/domain/penalties.ts`). Jeder Zustandswechsel wird im `AuditLog` protokolliert. Seit P4 sind alle Übergänge umgesetzt (Zahlungen: `recordPayment` im PaymentService, Regel `applyPayment` in der Regelverwaltung). Überfällig ist kein eigener Zustand: Eine Strafe in `OPEN` oder `PARTIAL` mit abgelaufener Frist wird in der Kassenwart-Ansicht nur markiert (`isOverdue`); die Mahngebühr von 5 € je Woche wird angezeigt, aber noch nicht automatisch gebucht.
