# Coding-Guidelines SquadHQ

> Vereinbart vom Team für P4 (11.11.2026). Gilt für allen Code in `src/`, `prisma/` und `tests/`.
> Die Regeln beschreiben, wie der vorhandene Code bereits geschrieben ist, und werden **automatisch geprüft** (Abschnitt 9).
> Wer eine Regel ändern will, schlägt das im Team vor und passt diese Datei und die Konfiguration im selben Commit an.

## Kurzfassung (eine Folie)

| Bereich | Regel | Warum | Geprüft durch |
| --- | --- | --- | --- |
| Formatierung | Prettier: 2 Leerzeichen, doppelte Anführungszeichen, Semikolon, max. 120 Zeichen | keine Diskussion über Stil, kleine Diffs im Review | `npm run format:check`, CI |
| Codequalität | ESLint (Next.js-Regeln + TypeScript), kein `any`, `===`, `import type` | Fehler finden, bevor die App läuft | `npm run lint`, CI |
| Schichten | Seite → Server Action → Service → Fachlogik / Datenbank, nie zurück | Architektur aus P3 bleibt im Code wahr | ESLint-Regel `no-restricted-imports`, CI |
| Benennung | Code Englisch, Oberfläche und Kommentare Deutsch, Namen aus der Namensliste | Code passt zu Prisma/Next.js, App passt zum Verein, Diagramme passen zum Code | Review |
| Tests | jede Fachregel mit Unit-Test, jeder MVP-Ablauf mit DB-Test, Testname nennt REQ/AK | Akzeptanzkriterien sind nachweisbar | `npm test` (62 Tests), CI |
| Commits | Deutsch, Satz im Präsens, was + wozu, Issue-Nummer | Board und Historie zeigen, wer was warum gemacht hat | Review |
| Branches | `main` ist immer lauffähig; Features auf `feature/<issue>-<kurz>` mit Pull Request und Review | Live-Demo bleibt stabil, zweite Person sieht jeden Code | CI auf jedem Push und PR |

## 1. Sprache und Technik

- **TypeScript** im Modus `strict` (siehe `tsconfig.json`). Kein `any`; wenn ein Typ unbekannt ist, `unknown` nehmen und prüfen.
  *Warum:* Der Compiler findet falsche Felder, vergessene `null`-Fälle und Tippfehler, bevor ein Spieler sie in der App sieht.
- **Next.js App Router** mit Server Components und Server Actions. `"use client"` nur, wenn der Browser wirklich etwas tun muss (z. B. Lade-Anzeige in `src/components/SubmitButton.tsx`).
  *Warum:* Weniger JavaScript im Browser, Datenbankzugriff bleibt auf dem Server.
- **Keine Klassen** (`class …`). Ein Service ist eine Datei mit exportierten Funktionen. Im Klassendiagramm heißt das `«Modul»` (siehe [Namensliste](architektur/namensliste.md)).
- **Geldbeträge immer in Cent als ganze Zahl**, Name endet auf `Cents` (`amountCents`, `paidCents`, `LATE_FEE_CENTS_PER_WEEK`). Euro nur zur Anzeige mit `formatEuro()`.
  *Warum:* Kommazahlen rechnen ungenau (0,1 + 0,2 ≠ 0,3); in einer Kasse darf kein Cent verloren gehen.
- **Zeiten** werden als `Date` (UTC) gespeichert und mit `formatDateTime()` in Berliner Zeit angezeigt; Eingaben aus Formularen über `parseBerlinDateTime()`.

## 2. Formatierung (Prettier)

Konfiguration: [`.prettierrc.json`](../.prettierrc.json), ausgenommen sind Doku und erzeugte Dateien ([`.prettierignore`](../.prettierignore)).

| Einstellung | Wert | Begründung |
| --- | --- | --- |
| `printWidth` | 120 | deutsche Texte und Tailwind-Klassen sind lang; bei 80 würde fast jede JSX-Zeile umbrechen |
| `tabWidth` | 2 | Standard in Next.js/React-Projekten |
| `singleQuote` | `false` | doppelte Anführungszeichen wie in JSX und JSON |
| `semi` | `true` | eindeutige Zeilenenden, keine Überraschungen durch automatische Semikolons |
| `trailingComma` | `"all"` | neue Zeile in Liste/Objekt ändert im Diff nur eine Zeile |
| `endOfLine` | `"auto"` | Team arbeitet unter Windows und Linux; Git speichert LF |

So geht's: In VS Code die empfohlenen Erweiterungen installieren (Hinweis erscheint beim Öffnen des Ordners, siehe `.vscode/extensions.json`). Dann formatiert der Editor beim Speichern. Ohne Editor: `npm run format`.

## 3. Codequalität (ESLint)

Konfiguration: [`eslint.config.mjs`](../eslint.config.mjs). Grundlage sind die offiziellen Regeln von Next.js (`next/core-web-vitals`, `next/typescript`, u. a. React-Hooks-Regeln). Formatierungsregeln sind abgeschaltet (`prettier`), damit sich ESLint und Prettier nie widersprechen.

Zusätzlich vereinbart:

| Regel | Begründung |
| --- | --- |
| `@typescript-eslint/no-explicit-any` | `any` schaltet die Typprüfung ab |
| `@typescript-eslint/no-unused-vars` (außer Namen mit `_`) | unbenutzte Variablen sind fast immer Reste oder Fehler |
| `@typescript-eslint/consistent-type-imports` | `import type` zeigt, was nur für Typen gebraucht wird; wichtig für die Schichtenregeln unten |
| `eqeqeq` | `==` wandelt Typen um (`"0" == 0`), `===` nicht |
| `prefer-const` | was sich nicht ändert, ist `const` |
| `no-console` (Warnung, `console.error`/`warn` erlaubt; in `prisma/` aus) | keine Debug-Ausgaben in der Live-App |

## 4. Schichten und Ordnerstruktur

Die fünf Schichten aus dem Komponentendiagramm ([komponenten.md](architektur/komponenten.md), [Namensliste](architektur/namensliste.md)) sind Ordner im Code:

| Schicht | Ordner | Darf importieren | Darf **nicht** importieren |
| --- | --- | --- | --- |
| 1 Präsentation | `src/app/**/page.tsx`, `src/components/` | Server Actions, Services (lesend), `@/lib/auth`, `@/lib/format`, UI-Bausteine | `@/lib/db`, `@prisma/client`, `@/domain/*` |
| 2 Anwendung | `src/app/actions.ts`, `src/lib/auth.ts`, `src/lib/registration.ts` | Services, Auth | wie Schicht 1 (Actions rufen Services) |
| 3 Services | `src/services/*Service.ts`, `src/services/penaltyEngine.ts` | Fachlogik, Datenbank, andere Services | Seiten, Komponenten, `next/*` |
| 4 Fachlogik | `src/domain/` | nichts außer anderen Dateien in `src/domain` | Datenbank, Prisma, Services, Next.js, React |
| 5 Datenzugriff | `src/lib/db.ts` (Prisma Client), `prisma/schema.prisma` | Prisma | – |

Reine Typ-Importe (`import type { User } from "@prisma/client"`) sind überall erlaubt, weil sie nach dem Kompilieren verschwinden.

*Warum:* Nach P3 hatten Seiten noch direkt auf Datenbank und Fachregeln zugegriffen, das Diagramm stimmte also nicht mit dem Code überein. Jetzt prüft ESLint die Regeln bei jedem Push: Ein `import { prisma } from "@/lib/db"` in einer Seite ist ein Fehler und die CI wird rot. Die Fachlogik bleibt ohne Datenbank und ist deshalb in Millisekunden unit-testbar.

Weitere Ordner: `prisma/` Datenmodell, Demo-Daten, Strafenkatalog und Datenbank-Skripte · `tests/` alle Tests · `docs/` Dokumentation.

## 5. Benennung

| Was | Konvention | Beispiel |
| --- | --- | --- |
| Bezeichner im Code (Variablen, Funktionen, Typen) | **Englisch** | `recordPayment`, `getTeamCash`, `PenaltyEntry` |
| Texte in der App, Kommentare, Doku, Testnamen, Commits | **Deutsch** | „Bezahlt (bar)“, `it("lehnt zu hohe Beträge ab")` |
| URLs und Query-Parameter (sieht der Nutzer) | Deutsch, klein | `/kasse`, `/termine/neu`, `?fehler=…` |
| Funktionen, Variablen | `camelCase`, Verb vorne | `approvePenalty`, `listSessions`, `isOverdue` |
| Funktionen, die etwas liefern | `get…` (eins), `list…` (mehrere), `is…`/`has…` (ja/nein) | `getPlayerAccount`, `listAuditLog`, `isOutstanding` |
| Server Actions | Name endet auf `Action` (Ausnahme: `login`, `loginWithPassword`, `logout`) | `payAction`, `createSessionAction` |
| Konstanten | `UPPER_SNAKE_CASE` | `DUE_DAYS`, `MIN_PASSWORD_LENGTH`, `PENALTY_LABEL` |
| Typen, Interfaces, React-Komponenten | `PascalCase` | `RuleLike`, `SubmitButton`, `ErrorNotice` |
| Dateien mit React-Komponente | `PascalCase.tsx` | `SubmitButton.tsx` (Sammeldatei: `ui.tsx`) |
| Andere TypeScript-Dateien | `camelCase.ts`, Service endet auf `Service` | `attendanceService.ts`, `format.ts` |
| Prisma-Modelle | Englisch, Einzahl, `PascalCase`; Felder `camelCase` | `TrainingSession.responseDeadline` |
| Enum-Werte | `UPPER_SNAKE_CASE` | `PENDING_APPROVAL`, `PAID_PAYPAL` |
| Anzeige eines Enum-Werts | Tabelle `…_LABEL` in `src/lib/format.ts` | `PENALTY_LABEL.OPEN` → „Offen“ |

**Namen für Bausteine kommen aus der [Namensliste](architektur/namensliste.md).** Wer einen neuen Service oder eine neue Seite anlegt, trägt ihn dort zuerst ein (deutscher Name + Codename + Datei), damit Diagramme und Code gleich heißen.

*Warum Englisch im Code:* Next.js, React und Prisma sind englisch; gemischte Namen wie `getStrafen` wären schwer zu lesen. *Warum Deutsch in der App:* Nutzer sind die TSV Kronshagen 1. Herren, die Begriffe kommen aus dem Strafenkatalog.

## 6. Kommentare und Doku

- **Jede Datei erklärt am Anfang in einem Kommentar** (`/** … */`), was sie macht und zu welcher Anforderung sie gehört (`REQ-PEN-02`, `MVP-5`). Beispiel: `src/services/paymentService.ts`. Bei Seiten (`page.tsx`) steht dieser Kommentar direkt über der exportierten Seitenfunktion.
- **Jede exportierte Funktion bekommt einen kurzen JSDoc-Kommentar**, wenn der Name nicht alles sagt (Regeln, Sonderfälle, Rechte).
- Kommentare erklären das **Warum**, nicht das Was. Gut: `// Überfällig wird hier berechnet, damit die Seite keine Fachregeln kennen muss (Schichtenregel)`. Schlecht: `// i um 1 erhöhen`.
- Anforderungs-IDs (`REQ-…`, `MVP-…`, `AK…`) im Kommentar bzw. Testnamen verbinden Code mit der [Traceability](traceability.md).
- Ändert sich ein Ablauf, Modell oder Name, werden im selben Commit die betroffenen Diagramme in `docs/architektur` angepasst.
- Kein auskommentierter alter Code; die alte Version steht in Git.

## 7. Fehlerbehandlung und Sicherheit

- Fachliche Fehler werfen ein `Error` mit **deutscher, verständlicher Meldung** (z. B. „Der Betrag ist höher als der offene Rest.“). Server Actions fangen ihn ab und zeigen ihn mit `?fehler=…` auf der Seite an (`ErrorNotice`).
- **Jede Server Action prüft zuerst Team und Recht** (`assertMember("kasse.buchen")` usw., Rechte-Tabelle in `src/domain/permissions.ts`) und ruft dann den zuständigen Service auf. Jede Seite im Team prüft mit `requireMember(recht)` (frei sind nur Einloggen, Registrieren und Datenschutz). Jede Service-Funktion bekommt die `teamId` und liest oder ändert nur Daten dieses Teams.
- Was zusammengehört, läuft in **einer Transaktion** (`prisma.$transaction`), z. B. Zahlung buchen + Protokolleintrag.
- **Audit-Log nie ändern oder löschen**, nur neue Einträge schreiben (`src/services/auditService.ts`, Datenbank-Trigger in `prisma/auditLogSchutz.ts`).
- Keine Geheimnisse im Repo: `.env` ist in `.gitignore`, nur `.env.example` mit Platzhaltern wird eingecheckt.

## 8. Tests

- Framework: **Vitest**, alle Tests in `tests/`, Dateiname `<thema>.test.ts`.
- **Unit-Tests** für reine Funktionen in `src/domain` und `src/lib` (ohne Datenbank), z. B. `tests/payments.test.ts`.
- **Datenbank-Tests** (Komponententests eines ganzen MVP-Ablaufs über die Services) heißen `<thema>.db.test.ts` und laufen nur mit `RUN_DB_TESTS=1` gegen eine Test-Datenbank, z. B. `tests/p4Flow.db.test.ts`. Nie gegen die Live-Datenbank, denn das Audit-Log ist unlöschbar.
- Testnamen auf Deutsch und mit Bezug: `describe("applyPayment (REQ-PEN-04)")`, `it("AK4: 1 Klick bar bezahlt den ganzen Betrag")`.
- Neue Fachregel oder Bugfix → zuerst ein Test, der ohne die Änderung fehlschlägt.
- Stand 09.11.2026: **62 Tests**, alle grün (52 Unit, 10 mit Datenbank).

## 9. Durchsetzung: so werden die Regeln eingehalten

| Wann | Was passiert |
| --- | --- |
| Beim Speichern in VS Code | Prettier formatiert, ESLint repariert, was automatisch geht (`.vscode/settings.json`) |
| Vor jedem Commit (lokal) | `npm run check` = Lint + Formatierung + Typen + Tests. Muss grün sein. |
| Bei jedem Push auf `main` und jedem Pull Request | GitHub Actions ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) prüft Lint, Formatierung, Typen, alle 62 Tests mit eigener Test-Datenbank und den Build wie auf Vercel. Ergebnis als grüner Haken bzw. rotes Kreuz am Commit. |
| Im Review | Benennung, Kommentare, Tests und Namensliste prüft die zweite Person (Checkliste unten). |

Befehle:

```bash
npm run check         # alles prüfen (vor jedem Commit)
npm run lint          # nur ESLint
npm run lint:fix      # ESLint repariert, was es kann
npm run format        # alle Dateien mit Prettier formatieren
npm run format:check  # nur prüfen, nichts ändern
```

Rotes Kreuz in GitHub? Auf das Kreuz klicken → „Details“ zeigt den Schritt, der fehlschlägt. Meist reicht lokal `npm run format` bzw. `npm run lint:fix`, dann neu committen.

## 10. Commits

- **Deutsch, ein Satz im Präsens, der sagt, was sich ändert und wozu.** Höchstens etwa 72 Zeichen in der ersten Zeile, kein Punkt am Ende.
- Issue-Nummer am Ende, damit GitHub den Commit am Issue und im Board anzeigt: `(#52)`. Mit `Closes #52` in der Beschreibung wird das Issue beim Merge geschlossen.
- Ein Commit = eine zusammenhängende Änderung (z. B. nicht Mahngebühr und Design in einem Commit).
- Jede Person committet ihre eigene Arbeit mit ihrem eigenen GitHub-Konto. So ist im Repo nachvollziehbar, wer was beigetragen hat.

Beispiele aus dem Repo und gut:

```text
Registrierung und Anmeldung mit E-Mail und Passwort
Schichten sauber trennen: Seiten greifen nicht mehr direkt auf Datenbank oder Fachregeln zu
Mahngebühr 5 € pro Woche automatisch buchen (#52)
```

Schlecht: `fix`, `update`, `asdf`, `Änderungen`.

## 11. Branches und Reviews

- **`main` ist immer lauffähig.** Von `main` wird die Live-Demo deployt; die CI muss dort grün sein.
- **Neue Features und größere Änderungen am Code** auf einem eigenen Branch: `feature/<issue>-<kurz>`, z. B. `feature/52-mahngebuehr`; Fehler: `fix/<issue>-<kurz>`.
- Fertig → **Pull Request** auf `main`, Beschreibung mit „Was / Warum / Wie getestet“ und `Closes #<issue>`.
- **Review durch eine zweite Person** aus dem Team (bevorzugt QA), bevor gemergt wird. CI muss grün sein.
- **Direkt auf `main`** nur für kleine Änderungen ohne Risiko: Doku, Diagramme, Tippfehler, Konfiguration. Auch dann vorher `npm run check`.

Review-Checkliste:

1. CI grün?
2. Macht der Code, was das Issue verlangt (Akzeptanzkriterien)?
3. Gibt es Tests für neue Regeln, und nennen sie REQ/AK?
4. Namen nach Abschnitt 5 und aus der Namensliste? Neue Bausteine dort eingetragen?
5. Schichtenregel eingehalten (keine Datenbank in Seiten)?
6. Kopfkommentar und Doku/Diagramme aktuell?
7. Keine Geheimnisse, kein `console.log`, kein auskommentierter Code?
