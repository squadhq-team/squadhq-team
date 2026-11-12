# Verhalten: Sequenzdiagramm REQ-PEN-02

> Stand Sprint „Features & Design“, 12.11.2026. Zeigt den Kernablauf: unentschuldigtes Fehlen beim Training → Strafvorschlag → Freigabe → Saldo, dazu die Zahlung beim Kassenwart (eigener Abschnitt unten). Die Teilnehmer heißen genauso wie die Komponenten im [Komponentendiagramm](komponenten.md) (siehe [Namensliste](namensliste.md)); die Übersicht zeigt dieselben Komponenten wie die Detailansicht, nur ohne Funktionsnamen. Bei einem Spiel läuft es genauso, nur mit Pos. 9 (40 €).

## Übersicht

```mermaid
sequenceDiagram
  actor T as Trainer
  participant TD as Termine
  participant ACT as Eingaben verarbeiten
  participant ATT as Zu-/Absagen & Anwesenheit
  participant PEN as Strafen vorschlagen & freigeben
  participant AUD as Protokollierung
  participant DB as Datenbank
  participant SP as Kasse
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
  participant TD as Termine<br/>(/termine/[id])
  participant ACT as Eingaben verarbeiten<br/>(Server Actions)
  participant AUTH as Einloggen & Rechteprüfung<br/>(Auth)
  participant ATT as Zu-/Absagen & Anwesenheit<br/>(AttendanceService)
  participant PEN as Strafen vorschlagen & freigeben<br/>(PenaltyEngine)
  participant RULES as Regelverwaltung<br/>(Penalties)
  participant PAY as Teamkasse & Zahlungen<br/>(PaymentService)
  participant AUD as Protokollierung<br/>(AuditService)
  participant DB as Datenbank<br/>(PostgreSQL)
  participant SP as Kasse<br/>(/kasse, Mein Konto)
  actor S as Spieler

  T->>TD: Klick „Unentschuldigt“ bei Spieler X
  TD->>ACT: setAttendanceAction(sessionId, playerId, UNEXCUSED)
  ACT->>AUTH: assertMember("anwesenheit.bestaetigen")
  ACT->>ATT: setByTrainer({teamId, trainerId, sessionId, playerId, status})
  activate ATT
  ATT->>DB: BEGIN, alten Status lesen, upsert Attendance(status=UNEXCUSED)
  opt Status hat sich geändert
    ATT->>AUD: logAttendanceChange(alt → UNEXCUSED)
    AUD->>DB: insert AuditLog (attendanceId)
  end
  ATT->>PEN: syncPenaltyForAttendance(tx, {teamId, sessionId, eventType, playerId, status, actorId})
  PEN->>RULES: absenceTriggerFor(TRAINING) → UNEXCUSED_ABSENCE
  PEN->>DB: Regeln des Teams mit diesem Auslöser lesen
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
    ACT->>AUTH: assertMember("strafen.freigeben")
    ACT->>PEN: approvePenalty(teamId, entryId, trainerId)
    PEN->>RULES: dueDateFrom(heute) → +7 Tage
    PEN->>DB: update status=OPEN, dueDate
    PEN->>AUD: logPenaltyChange(FREIGEGEBEN)
    AUD->>DB: insert AuditLog
    ACT-->>TD: Vorschlag verschwindet
  else Trainer verwirft
    T->>TD: Klick „Verwerfen“
    TD->>ACT: discardAction(entryId)
    ACT->>AUTH: assertMember("strafen.freigeben")
    ACT->>PEN: discardPenalty(teamId, entryId, trainerId)
    PEN->>DB: update status=CANCELLED
    PEN->>AUD: logPenaltyChange(VERWORFEN)
    AUD->>DB: insert AuditLog
    ACT-->>TD: Vorschlag verschwindet
  end

  S->>SP: öffnet /kasse (Mein Konto)
  SP->>AUTH: requireMember()
  SP->>PEN: getPlayerAccount(teamId, playerId)
  PEN->>PAY: applyLateFees(teamId) (fällige Mahngebühren buchen)
  PEN->>DB: select PenaltyEntry des Spielers
  DB-->>PEN: Einträge
  PEN->>RULES: balance(entries) zählt nur OPEN und PARTIAL
  PEN-->>SP: Saldo und sichtbare Einträge
  SP-->>S: nach Freigabe Saldo 20,00 €, Status „Offen“

  opt später: Trainer setzt „Entschuldigt“ (Strafe bereits freigegeben)
    T->>TD: Klick „Entschuldigt“
    TD->>ACT: setAttendanceAction(EXCUSED)
    ACT->>AUTH: assertMember("anwesenheit.bestaetigen")
    ACT->>ATT: setByTrainer({…, status: EXCUSED})
    ATT->>PEN: syncPenaltyForAttendance(tx, {…, status: EXCUSED})
    PEN->>DB: update status=CANCELLED (nur OPEN, PARTIAL bleibt)
    PEN->>AUD: logPenaltyChange(STORNIERT)
    AUD->>DB: insert AuditLog
    PEN->>DB: offene Mahngebühren dieser Strafe stornieren
    PEN->>AUD: logPenaltyChange(ERLASSEN) je Mahngebühr
  end
```

## Sequenzdiagramm Zahlung verbuchen (REQ-PEN-04, MVP-5)

Der Kassenwart verbucht eine freigegebene Strafe mit einem Klick als bar oder per PayPal bezahlt. Mit Betrag wird eine Teilzahlung verbucht.

```mermaid
sequenceDiagram
  autonumber
  actor K as Kassenwart
  participant KW as Kasse<br/>(/kasse, Offen)
  participant ACT as Eingaben verarbeiten<br/>(Server Actions)
  participant AUTH as Einloggen & Rechteprüfung<br/>(Auth)
  participant PAY as Teamkasse & Zahlungen<br/>(PaymentService)
  participant RULES as Regelverwaltung<br/>(Penalties)
  participant AUD as Protokollierung<br/>(AuditService)
  participant DB as Datenbank<br/>(PostgreSQL)

  K->>KW: öffnet /kasse
  KW->>AUTH: requireMember(), can("kasse.ansehen")
  KW->>PAY: getTeamCash(teamId)
  PAY->>PAY: applyLateFees(teamId)
  PAY->>RULES: missingLateFeeWeeks()
  PAY->>DB: fehlende Mahngebühren anlegen (automatisch, mit Protokoll)
  PAY->>DB: Forderungen und Kassenbuch lesen
  PAY->>RULES: openAmount(), isOverdue(), balance(), cashBalance()
  PAY-->>KW: offene (überfällig markiert) und bezahlte Forderungen, Salden, Kassenstand
  K->>KW: Klick „Bezahlt (bar)“
  KW->>ACT: payAction(entryId, CASH)
  ACT->>AUTH: assertMember("kasse.buchen")
  ACT->>PAY: recordPayment({teamId, entryId, actorId, method: CASH})
  activate PAY
  PAY->>DB: BEGIN, Strafe lesen
  PAY->>RULES: applyPayment(entry, CASH) → PAID_CASH
  PAY->>DB: update status, paidCents, method
  PAY->>AUD: logPenaltyChange(BEZAHLT, „20,00 € bar“)
  AUD->>DB: insert AuditLog
  PAY->>DB: COMMIT
  deactivate PAY
  ACT-->>KW: Forderung wandert zu „Bezahlt“
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
  OPEN --> CANCELLED: Trainer storniert / Status nachträglich nicht mehr UNEXCUSED
  PAID_CASH --> [*]
  PAID_PAYPAL --> [*]
  CANCELLED --> [*]
```

Im Saldo zählen nur `OPEN` und `PARTIAL` (Funktion `isOutstanding` in `src/domain/penalties.ts`). Jeder Zustandswechsel wird im `AuditLog` protokolliert. Eine teilweise bezahlte Strafe (`PARTIAL`) wird nicht mehr automatisch storniert, wenn der Trainer die Anwesenheit ändert: Es ist schon Geld geflossen, das klärt der Kassenwart.

Manuelle Strafen (Kasse → Strafe vergeben) starten beim Trainer direkt in `OPEN`, bei Betreuer und Kassenwart in `PENDING_APPROVAL`. Beiträge starten in `OPEN`. Überfällig ist kein eigener Zustand: Für jede angefangene Woche nach der Frist legt `applyLateFees` automatisch eine eigene Forderung „Mahngebühr“ (`kind = LATE_FEE`, 5 €) in `OPEN` an, die denselben Zuständen folgt; der Kassenwart kann sie erlassen (`CANCELLED`, Protokoll „ERLASSEN“), dann kommt sie nicht wieder.
