# Komponentenmodell und Schichtenarchitektur

> Überarbeitet nach dem P3-Feedback (09.11.2026): Die Kästen tragen jetzt konkrete Namen dessen, was die Komponente tut (z. B. „Einloggen & Rollenprüfung“, „Regelverwaltung“), statt abstrakter Schichtnamen. Komponentendiagramm und Schichtenarchitektur sind **ein und dasselbe Bild**: Die Rahmen sind die fünf Schichten, die Kästen darin die Komponenten. Alle Namen stehen in der [Namensliste](namensliste.md) und sind in allen Diagrammen gleich.
>
> **Legende:** Rahmen = Schicht (bzw. Knoten), Kasten = Komponente mit Codename in Klammern, Zylinder = Datenbank, Pfeil = Aufruf in Pfeilrichtung (nur von oben nach unten), Pfeilbeschriftung = genutzte Schnittstelle. Seit P4 (09.11.2026) sind alle Komponenten im Code, es gibt keine gestrichelten (geplanten) Kästen mehr.

## Übersicht

```mermaid
flowchart TB
  B["Browser auf dem Smartphone"]

  subgraph Server["Next.js-Server (Vercel)"]
    direction TB
    subgraph S1["1 Präsentation (Seiten)"]
      direction TB
      P_LOGIN["Einloggen & Registrieren<br/>Passwort vergessen<br/>(/, /registrieren, /passwort-…)"]
      P_SP["Spieler-Ansicht<br/>zu-/absagen, Kassenkonto<br/>(/spieler)"]
      P_TR["Trainer-Dashboard<br/>Training anlegen, Anwesenheit<br/>bestätigen, Strafen freigeben<br/>(/trainer)"]
      P_KW["Kassenwart-Ansicht<br/>Teamkasse, Zahlungen<br/>(/kasse)"]
      P_LOG["Protokoll-Ansicht<br/>(/protokoll)"]
    end
    subgraph S2["2 Anwendung"]
      direction TB
      ACT["Eingaben verarbeiten<br/>(Server Actions)"]
      AUTH["Einloggen & Rollenprüfung<br/>(Auth)"]
      REG["Registrierung<br/>(Registration)"]
    end
    subgraph S3["3 Services"]
      direction TB
      ATT["Zu-/Absagen & Anwesenheit<br/>(AttendanceService)"]
      PEN["Strafen vorschlagen & freigeben<br/>(PenaltyEngine)"]
      AUD["Protokollierung<br/>(AuditService)"]
      PAY["Zahlungen verbuchen<br/>(PaymentService)"]
    end
    subgraph S4["4 Fachlogik"]
      direction TB
      RULES["Regelverwaltung<br/>Strafenkatalog, Fälligkeit,<br/>Saldo, Zahlung, überfällig<br/>(Penalties)"]
    end
    subgraph S5["5 Datenzugriff"]
      direction TB
      ORM["Datenbankzugriff<br/>(Prisma Client)"]
    end
  end

  DB[("PostgreSQL<br/>(Supabase)")]
  SA["Supabase Auth<br/>Konten, Passwörter,<br/>Mails"]

  B -- "Seite laden,<br/>Formular senden" --> S1
  S1 -- "Formular senden,<br/>Rolle prüfen" --> S2
  S1 -- "Daten lesen" --> S3
  S2 -- "Daten ändern" --> S3
  S2 -- "Nutzer lesen" --> S5
  S3 -- "Regeln anwenden" --> S4
  S3 -- "speichern, lesen" --> S5
  S5 -- "SQL" --> DB
  S2 -- "anmelden, registrieren<br/>(HTTPS)" --> SA
  S4 ~~~ S5

```

## Detailansicht

Dieselben Schichten und Komponenten mit allen Aufrufen und den genutzten Funktionen.

```mermaid
flowchart TB
  B["Browser (Smartphone, mobile-first)<br/>zeigt HTML, sendet Formulare"]

  subgraph Server["Next.js-Server (Vercel)"]
    direction TB
    subgraph S1["1 Präsentation (src/app)"]
      P_LOGIN["Einloggen & Registrieren<br/>src/app/page.tsx, registrieren,<br/>passwort-vergessen, passwort-neu,<br/>auth/callback"]
      P_SP["Spieler-Ansicht<br/>src/app/spieler/page.tsx"]
      P_TR["Trainer-Dashboard<br/>src/app/trainer/…"]
      P_KW["Kassenwart-Ansicht<br/>src/app/kasse/page.tsx"]
      P_LOG["Protokoll-Ansicht<br/>src/app/protokoll/page.tsx"]
    end
    subgraph S2["2 Anwendung"]
      ACT["Eingaben verarbeiten<br/>Server Actions<br/>src/app/actions.ts"]
      AUTH["Einloggen & Rollenprüfung<br/>Auth<br/>src/lib/auth.ts"]
      REG["Registrierung<br/>Registration<br/>src/lib/registration.ts"]
    end
    subgraph S3["3 Services"]
      ATT["Zu-/Absagen & Anwesenheit<br/>AttendanceService"]
      PEN["Strafen vorschlagen & freigeben<br/>PenaltyEngine"]
      AUD["Protokollierung<br/>AuditService"]
      PAY["Zahlungen verbuchen<br/>PaymentService"]
    end
    subgraph S4["4 Fachlogik"]
      RULES["Regelverwaltung<br/>Penalties<br/>src/domain/penalties.ts"]
    end
    subgraph S5["5 Datenzugriff"]
      ORM["Datenbankzugriff<br/>Prisma Client, src/lib/db.ts"]
    end
  end

  DB[("PostgreSQL<br/>(Supabase)")]
  SA["Supabase Auth<br/>(@supabase/ssr, src/lib/supabase.ts)"]

  B -- "HTTPS GET (Seite laden)" --> S1
  B -- "HTTPS POST (Formular)" --> ACT

  P_LOGIN -- "listLoginUsers()" --> AUTH
  P_SP -- "requireRole()" --> AUTH
  P_TR -- "requireRole()" --> AUTH
  P_SP -- "listUpcomingForPlayer()" --> ATT
  P_SP -- "getPlayerAccount()" --> PEN
  P_TR -- "listSessions()<br/>getAttendanceList()" --> ATT
  P_TR -- "listPendingForSession()" --> PEN
  P_KW -- "requireRole()" --> AUTH
  P_KW -- "getTeamCash()" --> PAY
  P_LOG -- "requireRole()" --> AUTH
  P_LOG -- "listAuditLog()" --> AUD

  ACT -- "assertRole(), signIn()<br/>signInWithPassword(), signOut()<br/>requestPasswordReset()<br/>updatePassword()" --> AUTH
  ACT -- "registerUser()" --> REG
  AUTH -- "ensureAppUser()" --> REG
  ACT -- "respond(), createSession()<br/>setByTrainer()" --> ATT
  ACT -- "approvePenalty()<br/>discardPenalty()" --> PEN
  ACT -- "recordPayment()" --> PAY

  ATT -- "syncPenaltyForAttendance()" --> PEN
  PEN -- "logPenaltyChange()" --> AUD
  ATT -- "logAttendanceChange()" --> AUD
  PAY -- "logPenaltyChange()" --> AUD
  PAY -- "applyPayment(), openAmount()<br/>isOverdue(), weeksOverdue()" --> RULES
  ATT -- "PLAYER_CHOICES" --> RULES
  PEN -- "suggestRuleForAttendance()<br/>dueDateFrom(), balance()" --> RULES

  AUTH --> ORM
  ATT --> ORM
  PEN --> ORM
  AUD --> ORM
  PAY --> ORM
  REG --> ORM
  ORM -- "SQL über TCP" --> DB
  AUTH -- "signInWithPassword(), getUser()<br/>resetPasswordForEmail(), updateUser()" --> SA
  REG -- "signUp()" --> SA

  P_SP ~~~ ACT
```

Lesend greifen die Seiten über die Services zu, schreibend nur über die Server Actions. Alle Pfeile zeigen nach unten; eine Schicht darf eine tiefere überspringen (gelockerte Schichtenarchitektur), aber nie nach oben zeigen. Die Seiten kennen weder die Datenbank noch die Fachlogik direkt. Begründung siehe [Architekturbegründung](architekturbegruendung.md).

## Komponenten und Schnittstellen

| Schicht | Komponente (Codename) | Verantwortung | Angebotene Schnittstelle |
| --- | --- | --- | --- |
| 1 Präsentation | Einloggen & Registrieren (`/`, `/registrieren`, `/passwort-vergessen`, `/passwort-neu`, `/auth/callback`) | mit E-Mail und Passwort anmelden, Konto anlegen, Passwort zurücksetzen, Links aus Mails von Supabase annehmen; für Präsentationen zusätzlich Demo-Anmeldung per Klick (abschaltbar mit `DEMO_LOGIN=off`) | – (UI) |
| 1 Präsentation | Spieler-Ansicht (`/spieler`) | Training zu- oder absagen, eigenes Kassenkonto mit Saldo | – (UI) |
| 1 Präsentation | Trainer-Dashboard (`/trainer`, `/trainer/neu`, `/trainer/training/[id]`) | Trainingsübersicht, Training anlegen (MVP-1), Anwesenheit bestätigen, Strafvorschläge freigeben oder verwerfen | – (UI) |
| 1 Präsentation | Kassenwart-Ansicht (`/kasse`, MVP-4/5) | Teamkasse: offene und bezahlte Strafen, Summen, Überfällige markiert; Zahlungen verbuchen (nur Kassenwart, Trainer liest mit) | – (UI) |
| 1 Präsentation | Protokoll-Ansicht (`/protokoll`, MVP-6) | Audit-Log lesen (Trainer und Kassenwart) | – (UI) |
| 2 Anwendung | Eingaben verarbeiten (Server Actions) | Einstieg aller Schreibzugriffe: Rolle prüfen, genau einen Service aufrufen, Seite aktualisieren | `login`, `loginWithPassword`, `registerAction`, `requestPasswordResetAction`, `updatePasswordAction`, `logout`, `respondAction`, `createSessionAction`, `setAttendanceAction`, `approveAction`, `discardAction`, `payAction` |
| 2 Anwendung | Einloggen & Rollenprüfung (Auth) | an- und abmelden über Supabase Auth bzw. Demo-Anmeldung (signiertes Cookie), Passwort zurücksetzen, aktuelle Person ermitteln, Rollen prüfen (REQ-SEC-01) | `listLoginUsers()`, `signIn()`, `signInWithPassword()`, `signOut()`, `requestPasswordReset()`, `updatePassword()`, `exchangeAuthLink()`, `isEmailLoginEnabled()`, `isDemoLoginEnabled()`, `getCurrentUser()`, `requireRole()`, `assertRole()`, `homeFor()`, `areasFor()` |
| 2 Anwendung | Registrierung (Registration, `registration.ts`) | Konto bei Supabase Auth anlegen und mit einem Spieler in `User` verknüpfen (`authId`); das Passwort kennt nur Supabase | `validateRegistration()`, `validateNewPassword()`, `registerUser()`, `ensureAppUser()`, `translateAuthError()` |
| extern | Supabase Auth | Konten, Passwörter, Sitzungs-Cookies, Mails (Bestätigung, Passwort vergessen) | REST-API über `@supabase/ssr` (`src/lib/supabase.ts`, `src/middleware.ts`) |
| 3 Services | Zu-/Absagen & Anwesenheit (AttendanceService) | Trainings anlegen, Rückmeldungen speichern, Anwesenheit durch den Trainer bestätigen (mit Protokoll), Anwesenheitsliste liefern | `createSession()`, `respond()`, `setByTrainer()`, `listUpcomingForPlayer()`, `listSessions()`, `getAttendanceList()` |
| 3 Services | Strafen vorschlagen & freigeben (PenaltyEngine) | Strafvorschlag nach Katalog, Freigabe, Verwerfen, Storno, Kassenkonto | `syncPenaltyForAttendance()`, `approvePenalty()`, `discardPenalty()`, `listPenaltiesForPlayer()`, `getPlayerAccount()`, `listPendingForSession()` |
| 3 Services | Protokollierung (AuditService) | unveränderliches Protokoll jeder Statusänderung einer Strafe und jeder vom Trainer gesetzten Anwesenheit (REQ-AUD-01) | `logPenaltyChange()`, `logAttendanceChange()`, `listAuditLog()` |
| 3 Services | Zahlungen verbuchen (PaymentService, MVP-4/5) | Zahlung bar oder PayPal verbuchen (auch Teilzahlung), Teamkasse mit Summen und Überfälligen | `recordPayment()`, `getTeamCash()` |
| 4 Fachlogik | Regelverwaltung (Penalties, `penalties.ts`) | Regeln des TSVK-Strafenkatalogs ohne Datenbank: welche Strafe greift, Fälligkeit, offener Betrag, Saldo, Zahlung und Teilzahlung, überfällig; unit-getestet | `suggestRuleForAttendance()`, `isOutstanding()`, `openAmount()`, `balance()`, `dueDateFrom()`, `applyPayment()`, `isOverdue()`, `weeksOverdue()`, `PLAYER_CHOICES`, `DUE_DAYS`, `LATE_FEE_CENTS_PER_WEEK` |
| 5 Datenzugriff | Datenbankzugriff (Prisma Client) | Lesen, Schreiben, Transaktionen | generiert aus `prisma/schema.prisma` |
