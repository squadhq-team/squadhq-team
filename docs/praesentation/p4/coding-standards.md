# P4-Folie: Coding-Standards

Bild für die Folie: [coding-standards.png](coding-standards.png) (16:9, 3200 × 1800). Ausführlich: [docs/coding-guidelines.md](../../coding-guidelines.md).

## Stichpunkte (falls die Folie selbst gebaut wird)

**Coding-Standards: vereinbart, begründet, durchgesetzt**

- **Formatierung:** Prettier (2 Leerzeichen, doppelte Anführungszeichen, max. 120 Zeichen) → kein Streit über Stil, kleine Diffs
- **Codequalität:** ESLint mit Next.js- und TypeScript-Regeln, `strict`, kein `any` → Fehler vor dem Nutzer finden
- **Schichten:** Seite → Server Action → Service → Fachlogik / Datenbank, als ESLint-Regel geprüft → Architektur aus P3 bleibt im Code wahr
- **Benennung:** Code Englisch, App-Texte und Kommentare Deutsch, Namen aus der Namensliste, Geld in Cent
- **Tests:** jede Fachregel mit Unit-Test, jeder MVP-Ablauf mit Datenbank-Test, Testname nennt REQ/AK (62 Tests)
- **Commits & Branches:** Deutsch, „was + wozu“, Issue-Nummer; Features auf `feature/…` mit Pull Request und Review
- **Durchsetzung:** Editor formatiert beim Speichern → `npm run check` vor dem Commit → GitHub Actions bei jedem Push und Pull Request (Lint, Format, Typen, 62 Tests, Build) → Review durch eine zweite Person

## Sprechtext (ca. 45 Sekunden)

> Unsere Coding-Standards sind in `docs/coding-guidelines.md` festgehalten, und zu jeder Regel steht dort die Begründung. Die Formatierung übernimmt Prettier, die Codequalität prüft ESLint mit den offiziellen Regeln von Next.js und TypeScript im strikten Modus. Besonders wichtig ist uns die Schichtenregel aus dem Architekturentwurf: Eine Seite darf nicht direkt auf die Datenbank zugreifen, sondern nur über einen Service. Diese Regel ist als ESLint-Regel hinterlegt und wird damit automatisch geprüft. Im Code verwenden wir englische Bezeichner, in der App und in Kommentaren Deutsch, und die Namen der Bausteine kommen aus unserer Namensliste, damit Code und Diagramme übereinstimmen.
>
> Eingehalten werden die Regeln in vier Stufen: Der Editor formatiert beim Speichern, vor jedem Commit läuft `npm run check`, und bei jedem Push prüft GitHub Actions Lint, Formatierung, Typen, alle 62 Tests und den Build. Zum Schluss prüft eine zweite Person den Code im Review anhand einer Checkliste.
