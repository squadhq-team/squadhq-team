## Was

<!-- Was ändert sich? Ein bis drei Sätze. -->

## Warum

<!-- Welches Issue / welche Anforderung? Mit „Closes #123“ wird das Issue beim Merge geschlossen. -->

Closes #

## Wie getestet

<!-- Welche Tests sind neu oder geändert? Was wurde von Hand ausprobiert? -->

- [ ] `npm run check` lokal grün
- [ ] neue Fachregel oder Bugfix hat einen Test, der ohne die Änderung fehlschlägt

## Review-Checkliste (füllt die zweite Person aus)

Regeln: [docs/coding-guidelines.md](../docs/coding-guidelines.md), Ablauf und Ergebnis-Tabelle: [docs/testing/review-protokoll.md](../docs/testing/review-protokoll.md)

- [ ] CI grün (Prüfung und Akzeptanztests)
- [ ] Macht der Code, was das Issue verlangt (Akzeptanzkriterien)?
- [ ] Gibt es Tests für neue Regeln, und nennen sie REQ/AK?
- [ ] Namen nach Abschnitt 5 und aus der Namensliste? Neue Bausteine dort eingetragen?
- [ ] Schichtenregel eingehalten (keine Datenbank in Seiten)?
- [ ] Kopfkommentar und Doku/Diagramme aktuell?
- [ ] Keine Geheimnisse, kein `console.log`, kein auskommentierter Code?
- [ ] Ergebnis in die Tabelle im Review-Protokoll eingetragen
