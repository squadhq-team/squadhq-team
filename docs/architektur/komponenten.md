# Komponentenmodell und Schichtenarchitektur

> Überarbeitet nach dem P3-Feedback (09.11.2026): Die Kästen tragen jetzt konkrete Namen dessen, was die Komponente tut (z. B. „Einloggen & Rollenprüfung“, „Regelverwaltung“), statt abstrakter Schichtnamen. Komponentendiagramm und Schichtenarchitektur sind **ein und dasselbe Bild**: Die Rahmen sind die fünf Schichten, die Kästen darin die Komponenten. Alle Namen stehen in der [Namensliste](namensliste.md) und sind in allen Diagrammen gleich.
>
> **Legende:** Rahmen = Schicht (bzw. Knoten), Kasten = Komponente mit Codename in Klammern, Zylinder = Datenbank, Pfeil = Aufruf in Pfeilrichtung (nur von oben nach unten), Pfeilbeschriftung = genutzte Schnittstelle, gestrichelter Kasten = geplant für P4, noch nicht im Code.

## Übersicht

```mermaid
flowchart TB
  B["Browser auf dem Smartphone"]

  subgraph Server["Next.js-Server (Vercel)"]
    direction TB
    subgraph S1["1 Präsentation (Seiten)"]
      direction TB
      P_LOGIN["Einloggen<br/>(Seite /)"]
      P_SP["Spieler-Ansicht<br/>zu-/absagen, Kassenkonto<br/>(/spieler)"]
      P_TR["Trainer-Dashboard<br/>Anwesenheit bestätigen,<br/>Strafen freigeben<br/>(/trainer)"]
      P_KW["Kassenwart-Ansicht<br/>(geplant P4)"]
    end
    subgraph S2["2 Anwendung"]
      direction TB
      ACT["Eingaben verarbeiten<br/>(Server Actions)"]
      AUTH["Einloggen & Rollenprüfung<br/>(Auth)"]
      REG["Registrierung<br/>(geplant P4)"]
    end
    subgraph S3["3 Services"]
      direction TB
      ATT["Zu-/Absagen & Anwesenheit<br/>(AttendanceService)"]
      PEN["Strafen vorschlagen & freigeben<br/>(PenaltyEngine)"]
      AUD["Protokollierung<br/>(AuditService)"]
      PAY["Zahlungen verbuchen<br/>(geplant P4)"]
    end
    subgraph S4["4 Fachlogik"]
      direction TB
      RULES["Regelverwaltung<br/>Strafenkatalog, Fälligkeit, Saldo<br/>(Penalties)"]
    end
    subgraph S5["5 Datenzugriff"]
      direction TB
      ORM["Datenbankzugriff<br/>(Prisma Client)"]
    end
  end

  DB[("PostgreSQL<br/>(Supabase)")]

  B -- "Seite laden,<br/>Formular senden" --> S1
  S1 -- "Formular senden,<br/>Rolle prüfen" --> S2
  S1 -- "Daten lesen" --> S3
  S2 -- "Daten ändern" --> S3
  S2 -- "Nutzer lesen" --> S5
  S3 -- "Regeln anwenden" --> S4
  S3 -- "speichern, lesen" --> S5
  S5 -- "SQL" --> DB
  S4 ~~~ S5

  classDef geplant stroke-dasharray: 5 5,fill:#f6f6f6,color:#666
  class P_KW,REG,PAY geplant
```

## Detailansicht

Dieselben Schichten und Komponenten mit allen Aufrufen und den genutzten Funktionen.

```mermaid
flowchart TB
  B["Browser (Smartphone, mobile-first)<br/>zeigt HTML, sendet Formulare"]

  subgraph Server["Next.js-Server (Vercel)"]
    direction TB
    subgraph S1["1 Präsentation (src/app)"]
      P_LOGIN["Einloggen<br/>src/app/page.tsx"]
      P_SP["Spieler-Ansicht<br/>src/app/spieler/page.tsx"]
      P_TR["Trainer-Dashboard<br/>src/app/trainer/…"]
    end
    subgraph S2["2 Anwendung"]
      ACT["Eingaben verarbeiten<br/>Server Actions<br/>src/app/actions.ts"]
      AUTH["Einloggen & Rollenprüfung<br/>Auth<br/>src/lib/auth.ts"]
    end
    subgraph S3["3 Services"]
      ATT["Zu-/Absagen & Anwesenheit<br/>AttendanceService"]
      PEN["Strafen vorschlagen & freigeben<br/>PenaltyEngine"]
      AUD["Protokollierung<br/>AuditService"]
    end
    subgraph S4["4 Fachlogik"]
      RULES["Regelverwaltung<br/>Penalties<br/>src/domain/penalties.ts"]
    end
    subgraph S5["5 Datenzugriff"]
      ORM["Datenbankzugriff<br/>Prisma Client, src/lib/db.ts"]
    end
  end

  DB[("PostgreSQL<br/>(Supabase)")]

  B -- "HTTPS GET (Seite laden)" --> S1
  B -- "HTTPS POST (Formular)" --> ACT

  P_LOGIN -- "listLoginUsers()" --> AUTH
  P_SP -- "requireRole()" --> AUTH
  P_TR -- "requireRole()" --> AUTH
  P_SP -- "listUpcomingForPlayer()" --> ATT
  P_SP -- "getPlayerAccount()" --> PEN
  P_TR -- "listSessions()<br/>getAttendanceList()" --> ATT
  P_TR -- "listPendingForSession()" --> PEN

  ACT -- "assertRole()<br/>signIn(), signOut()" --> AUTH
  ACT -- "respond()<br/>setByTrainer()" --> ATT
  ACT -- "approvePenalty()<br/>discardPenalty()" --> PEN

  ATT -- "syncPenaltyForAttendance()" --> PEN
  PEN -- "logPenaltyChange()" --> AUD
  ATT -- "PLAYER_CHOICES" --> RULES
  PEN -- "suggestRuleForAttendance()<br/>dueDateFrom(), balance()" --> RULES

  AUTH --> ORM
  ATT --> ORM
  PEN --> ORM
  AUD --> ORM
  ORM -- "SQL über TCP" --> DB

  P_SP ~~~ ACT
```

Lesend greifen die Seiten über die Services zu, schreibend nur über die Server Actions. Alle Pfeile zeigen nach unten; eine Schicht darf eine tiefere überspringen (gelockerte Schichtenarchitektur), aber nie nach oben zeigen. Die Seiten kennen weder die Datenbank noch die Fachlogik direkt. Begründung siehe [Architekturbegründung](architekturbegruendung.md).

## Komponenten und Schnittstellen

| Schicht | Komponente (Codename) | Verantwortung | Angebotene Schnittstelle |
| --- | --- | --- | --- |
| 1 Präsentation | Einloggen (`/`) | Person aus der Demo-Liste wählen, bis Registrierung und Login mit Supabase Auth kommen | – (UI) |
| 1 Präsentation | Spieler-Ansicht (`/spieler`) | Training zu- oder absagen, eigenes Kassenkonto mit Saldo | – (UI) |
| 1 Präsentation | Trainer-Dashboard (`/trainer`, `/trainer/training/[id]`) | Trainingsübersicht, Anwesenheit bestätigen, Strafvorschläge freigeben oder verwerfen | – (UI) |
| 1 Präsentation | Kassenwart-Ansicht (geplant P4, MVP-4/5) | alle Strafen, Zahlungen verbuchen | – (UI) |
| 2 Anwendung | Eingaben verarbeiten (Server Actions) | Einstieg aller Schreibzugriffe: Rolle prüfen, genau einen Service aufrufen, Seite aktualisieren | `login`, `logout`, `respondAction`, `setAttendanceAction`, `approveAction`, `discardAction` |
| 2 Anwendung | Einloggen & Rollenprüfung (Auth) | an- und abmelden, aktuelle Person ermitteln, Rollen prüfen (REQ-SEC-01) | `listLoginUsers()`, `signIn()`, `signOut()`, `getCurrentUser()`, `requireRole()`, `assertRole()`, `homeFor()`, `areasFor()` |
| 2 Anwendung | Registrierung (geplant P4) | eigenes Konto mit Supabase Auth anlegen | – |
| 3 Services | Zu-/Absagen & Anwesenheit (AttendanceService) | Rückmeldungen speichern, Anwesenheit durch den Trainer bestätigen, Anwesenheitsliste liefern | `respond()`, `setByTrainer()`, `listUpcomingForPlayer()`, `listSessions()`, `getAttendanceList()` |
| 3 Services | Strafen vorschlagen & freigeben (PenaltyEngine) | Strafvorschlag nach Katalog, Freigabe, Verwerfen, Storno, Kassenkonto | `syncPenaltyForAttendance()`, `approvePenalty()`, `discardPenalty()`, `listPenaltiesForPlayer()`, `getPlayerAccount()`, `listPendingForSession()` |
| 3 Services | Protokollierung (AuditService) | unveränderliches Protokoll jeder Statusänderung einer Strafe (REQ-AUD-01) | `logPenaltyChange()` |
| 3 Services | Zahlungen verbuchen (geplant P4, MVP-5) | Strafe als bar oder PayPal bezahlt markieren | – |
| 4 Fachlogik | Regelverwaltung (Penalties, `penalties.ts`) | Regeln des TSVK-Strafenkatalogs ohne Datenbank: welche Strafe greift, Fälligkeit, offener Betrag, Saldo; unit-getestet | `suggestRuleForAttendance()`, `isOutstanding()`, `openAmount()`, `balance()`, `dueDateFrom()`, `PLAYER_CHOICES`, `DUE_DAYS` |
| 5 Datenzugriff | Datenbankzugriff (Prisma Client) | Lesen, Schreiben, Transaktionen | generiert aus `prisma/schema.prisma` |
