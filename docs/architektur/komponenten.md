# Komponentenmodell (High-Level-Struktur)

> Entwurf für P3. Verantwortlich: Architektur & Entwurf. Notation: UML-Komponentendiagramm in Mermaid (rendert direkt auf GitHub).

```mermaid
flowchart TB
  subgraph Client["Browser (Smartphone, mobile-first)"]
    UI_S["Spieler-Ansicht<br/>/spieler"]
    UI_T["Trainer-Dashboard<br/>/trainer, /trainer/training/[id]"]
    UI_L["Demo-Anmeldung<br/>/"]
  end

  subgraph Server["Next.js-Server (Vercel)"]
    direction TB
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

  UI_S -- "Formular-Submit<br/>respondAction" --> ACT
  UI_T -- "setAttendanceAction<br/>approveAction / discardAction" --> ACT
  UI_L -- "login" --> ACT
  ACT -- "assertRole()" --> AUTH
  ACT --> ATT
  ACT --> PEN
  ATT -- "syncPenaltyForAttendance()" --> PEN
  PEN -- "logPenaltyChange()" --> AUD
  ATT --> DOM
  PEN --> DOM
  ATT --> ORM
  PEN --> ORM
  AUD --> ORM
  ORM -- "SQL über TCP" --> DB
```

## Komponenten und Schnittstellen

| Komponente | Verantwortung | Angebotene Schnittstelle |
| --- | --- | --- |
| Spieler-Ansicht | Rückmeldung zu Trainings, eigenes Kassenkonto | – (UI) |
| Trainer-Dashboard | Trainingsübersicht, Anwesenheit bestätigen, Strafvorschläge freigeben | – (UI) |
| Server Actions | Einstiegspunkt aller Schreibzugriffe, Rollenprüfung, Revalidierung | `login`, `logout`, `respondAction`, `setAttendanceAction`, `approveAction`, `discardAction` |
| Auth | aktuelle Person ermitteln, Rollen prüfen (REQ-SEC-01) | `getCurrentUser()`, `requireRole()`, `assertRole()` |
| AttendanceService | Rückmeldungen speichern, Anwesenheitsliste liefern | `respond()`, `setByTrainer()`, `listUpcomingForPlayer()`, `listSessions()`, `getAttendanceList()` |
| PenaltyEngine | Strafvorschlag nach Katalog, Freigabe, Verwerfen, Storno | `syncPenaltyForAttendance()`, `approvePenalty()`, `discardPenalty()`, `listPenaltiesForPlayer()`, `listPendingForSession()` |
| AuditService | unveränderliches Protokoll jeder Statusänderung | `logPenaltyChange()` |
| Fachlogik | reine Regeln ohne Seiteneffekte, unit-getestet | `suggestRuleForAttendance()`, `balance()`, `openAmount()`, `dueDateFrom()` |
| Prisma Client | Datenzugriff, Transaktionen | generiert aus `prisma/schema.prisma` |
