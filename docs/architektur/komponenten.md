# Komponentenmodell (High-Level-Struktur)

> Entwurf für P3. Verantwortlich: Architektur & Entwurf. Notation: Komponentendiagramm in Anlehnung an UML, gezeichnet als Mermaid-Flowchart (Mermaid hat keinen eigenen UML-Komponententyp, rendert aber direkt auf GitHub).
>
> **Legende:** Kasten = Komponente, Zylinder = Datenbank, gruppierender Rahmen = Knoten bzw. Schicht, Pfeil = Konnektor (Aufruf in Pfeilrichtung), Pfeilbeschriftung = genutzte Schnittstelle bzw. Protokoll.

## Übersicht

```mermaid
flowchart LR
  B["Browser<br/>(Smartphone)"]

  subgraph Server["Next.js-Server (Vercel)"]
    P["Präsentation<br/>Seiten: Spieler,<br/>Trainer, Anmeldung"]
    A["Server Actions"]
    AUTH["Auth<br/>Rollenprüfung"]
    S["Service-Schicht<br/>AttendanceService<br/>PenaltyEngine<br/>AuditService"]
    DOM["Fachlogik<br/>Strafregeln, Saldo"]
    ORM["Prisma ORM"]
  end

  DB[("PostgreSQL<br/>(Supabase)")]

  B -- "Seite laden" --> P
  B -- "Formular senden" --> A
  P -- "Rolle prüfen" --> AUTH
  A -- "Rolle prüfen" --> AUTH
  P -- "Daten lesen" --> S
  A -- "Daten ändern" --> S
  S -- "Regeln anwenden" --> DOM
  S -- "Datenzugriff" --> ORM
  ORM -- "SQL" --> DB
```

## Detailansicht

Dieselbe Struktur mit allen Konnektoren und den genutzten Schnittstellen (Funktionsnamen).

```mermaid
flowchart TB
  B["Browser (Smartphone, mobile-first)<br/>zeigt HTML, sendet Formulare"]

  subgraph Server["Next.js-Server (Vercel)"]
    direction TB
    subgraph Praes["Präsentation: Seiten als React Server Components (src/app)"]
      UI_L["Demo-Anmeldung<br/>/"]
      UI_S["Spieler-Ansicht<br/>/spieler"]
      UI_T["Trainer-Dashboard<br/>/trainer, /trainer/training/[id]"]
    end
    ACT["Server Actions<br/>src/app/actions.ts"]
    AUTH["Auth / Rollenprüfung<br/>src/lib/auth.ts"]
    subgraph Services["Service-Schicht (src/services)"]
      ATT["AttendanceService"]
      PEN["PenaltyEngine"]
      AUD["AuditService"]
    end
    DOM["Fachlogik (rein, ohne DB)<br/>src/domain/penalties.ts"]
    ORM["Prisma Client<br/>src/lib/db.ts"]
  end

  DB[("PostgreSQL<br/>(Supabase)")]

  B -- "HTTPS GET (Seite laden)" --> Praes
  B -- "HTTPS POST (Formular-Submit)<br/>login, logout, respondAction,<br/>setAttendanceAction, approveAction, discardAction" --> ACT

  UI_S -- "requireRole()" --> AUTH
  UI_T -- "requireRole()" --> AUTH
  UI_S -- "listUpcomingForPlayer()" --> ATT
  UI_S -- "listPenaltiesForPlayer()" --> PEN
  UI_S -- "balance()" --> DOM
  UI_T -- "listSessions()<br/>getAttendanceList()" --> ATT
  UI_T -- "listPendingForSession()" --> PEN
  UI_L -. "Nutzerliste (nur Demo)" .-> ORM

  ACT -- "assertRole()" --> AUTH
  ACT -- "respond()<br/>setByTrainer()" --> ATT
  ACT -- "approvePenalty()<br/>discardPenalty()" --> PEN
  ACT -. "login: Nutzer suchen (nur Demo)" .-> ORM
  ATT -- "syncPenaltyForAttendance()" --> PEN
  PEN -- "logPenaltyChange()" --> AUD
  ATT -- "PLAYER_CHOICES" --> DOM
  PEN -- "suggestRuleForAttendance()<br/>dueDateFrom()" --> DOM
  AUTH --> ORM
  ATT --> ORM
  PEN --> ORM
  AUD --> ORM
  ORM -- "SQL über TCP" --> DB
```

Lesend greifen die Seiten direkt auf die Services zu, schreibend nur über Server Actions. Die gestrichelten Pfeile sind die Demo-Anmeldung, die die Nutzerliste ohne Service liest; sie wird zu P4 durch Supabase Auth ersetzt.

## Komponenten und Schnittstellen

| Komponente | Verantwortung | Angebotene Schnittstelle |
| --- | --- | --- |
| Demo-Anmeldung | Person aus der Demo-Liste wählen (bis Supabase Auth kommt) | – (UI) |
| Spieler-Ansicht | Rückmeldung zu Trainings, eigenes Kassenkonto mit Saldo | – (UI) |
| Trainer-Dashboard | Trainingsübersicht, Anwesenheit bestätigen, Strafvorschläge freigeben | – (UI) |
| Server Actions | Einstiegspunkt aller Schreibzugriffe, Rollenprüfung, Revalidierung | `login`, `logout`, `respondAction`, `setAttendanceAction`, `approveAction`, `discardAction` |
| Auth | aktuelle Person ermitteln, Rollen prüfen (REQ-SEC-01) | `getCurrentUser()`, `requireRole()`, `assertRole()`, `homeFor()`, `areasFor()` |
| AttendanceService | Rückmeldungen speichern, Anwesenheitsliste liefern | `respond()`, `setByTrainer()`, `listUpcomingForPlayer()`, `listSessions()`, `getAttendanceList()` |
| PenaltyEngine | Strafvorschlag nach Katalog, Freigabe, Verwerfen, Storno | `syncPenaltyForAttendance()`, `approvePenalty()`, `discardPenalty()`, `listPenaltiesForPlayer()`, `listPendingForSession()` |
| AuditService | unveränderliches Protokoll jeder Statusänderung einer Strafe | `logPenaltyChange()` |
| Fachlogik | reine Regeln ohne Seiteneffekte, unit-getestet | `suggestRuleForAttendance()`, `isOutstanding()`, `openAmount()`, `balance()`, `dueDateFrom()`, `PLAYER_CHOICES` |
| Prisma Client | Datenzugriff, Transaktionen | generiert aus `prisma/schema.prisma` |
