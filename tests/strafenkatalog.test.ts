/**
 * Prüft die Demo-Daten des Strafenkatalogs gegen den TSVK-Strafenkatalog 2026/27 (REQ-PEN-01),
 * siehe docs/anforderungen/strafenkatalog-tsvk-2026-27.md.
 */
import { describe, expect, it } from "vitest";
import { suggestRuleForAttendance } from "@/domain/penalties";
import { STRAFENKATALOG } from "../prisma/strafenkatalog";

const rules = STRAFENKATALOG.map((r, i) => ({
  id: `r${i}`,
  position: r.position,
  amountCents: r.amountCents,
  trigger: r.trigger,
  active: r.active ?? true,
}));
const byPosition = (p: number) => STRAFENKATALOG.find((r) => r.position === p);
const byTitle = (prefix: string) => STRAFENKATALOG.find((r) => r.title.startsWith(prefix));

describe("Strafenkatalog TSVK 2026/27 (REQ-PEN-01)", () => {
  it("enthält alle Positionen 1–13 inklusive Unterpositionen und die Verzugsregel", () => {
    expect(STRAFENKATALOG).toHaveLength(17);
    for (const p of [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12]) expect(byPosition(p), `Pos. ${p}`).toBeDefined();
    for (const p of ["5A", "5B", "13A", "13B", "13C"]) expect(byTitle(p), `Pos. ${p}`).toBeDefined();
  });

  it("hat eindeutige Positionsnummern (Schema: position @unique)", () => {
    const positions = STRAFENKATALOG.map((r) => r.position).filter((p) => p !== null);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it.each([
    [8, 2000],
    [9, 4000],
    [7, 500],
    [10, 700],
    [11, 2000],
    [12, 4000],
  ])("Pos. %i kostet %i Cent", (position, cents) => {
    expect(byPosition(position)?.amountCents).toBe(cents);
  });

  it("staffelt Verspätungen mit 2 €, 5 € und 10 €", () => {
    expect([byTitle("13A"), byTitle("13B"), byTitle("13C")].map((r) => r?.amountCents)).toEqual([200, 500, 1000]);
    expect([byTitle("13A"), byTitle("13B"), byTitle("13C")].every((r) => r?.trigger === "LATE")).toBe(true);
  });

  it("erhöht bei Zahlungsverzug um 5 € je Woche", () => {
    expect(byTitle("Zahlungsverzug")?.amountCents).toBe(500);
  });

  it("führt Kasten-Strafen (Pos. 1, 2) ohne Geldbetrag und deaktiviert", () => {
    for (const p of [1, 2]) expect(byPosition(p)).toMatchObject({ amountCents: 0, active: false });
  });

  it("schlägt bei unentschuldigtem Fehlen im Training genau Pos. 8 vor, nicht Pos. 9 (Spiel)", () => {
    expect(rules.filter((r) => r.trigger === "UNEXCUSED_ABSENCE")).toHaveLength(1);
    expect(suggestRuleForAttendance("UNEXCUSED", rules)).toMatchObject({ position: 8, amountCents: 2000 });
  });

  it("#47: schlägt beim Spiel und Turnier Pos. 9 (40 €) vor, bei Feier keine Strafe", () => {
    expect(suggestRuleForAttendance("UNEXCUSED", rules, "GAME")).toMatchObject({ position: 9, amountCents: 4000 });
    expect(suggestRuleForAttendance("UNEXCUSED", rules, "TOURNAMENT")).toMatchObject({ position: 9 });
    expect(suggestRuleForAttendance("UNEXCUSED", rules, "PARTY")).toBeNull();
  });

  it("#52: genau eine Regel für die automatische Mahngebühr", () => {
    expect(rules.filter((r) => r.trigger === "LATE_FEE")).toHaveLength(1);
  });
});
