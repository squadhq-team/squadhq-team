/**
 * Unit-Tests der Kassenlogik, abgeleitet aus den Akzeptanzkriterien von REQ-PEN-02 / REQ-PEN-03
 * (docs/testing/akzeptanzkriterien.md).
 */
import { describe, expect, it } from "vitest";
import { balance, dueDateFrom, openAmount, suggestRuleForAttendance, type RuleLike } from "@/domain/penalties";

const rules: RuleLike[] = [
  { id: "late", position: null, amountCents: 200, trigger: "LATE", active: true },
  { id: "pos8", position: 8, amountCents: 2000, trigger: "UNEXCUSED_ABSENCE", active: true },
];

describe("suggestRuleForAttendance (REQ-PEN-02)", () => {
  it("schlägt bei UNEXCUSED die Katalogposition 8 über 20,00 € vor", () => {
    const rule = suggestRuleForAttendance("UNEXCUSED", rules);
    expect(rule?.position).toBe(8);
    expect(rule?.amountCents).toBe(2000);
  });

  it.each(["ATTENDING", "EXCUSED", "UNSURE"] as const)("schlägt bei %s nichts vor", (status) => {
    expect(suggestRuleForAttendance(status, rules)).toBeNull();
  });

  it("ignoriert deaktivierte Regeln", () => {
    const inactive = rules.map((r) => ({ ...r, active: false }));
    expect(suggestRuleForAttendance("UNEXCUSED", inactive)).toBeNull();
  });
});

describe("balance (REQ-PEN-03)", () => {
  it("zählt Vorschläge erst nach der Freigabe (PENDING_APPROVAL zählt nicht)", () => {
    expect(balance([{ amountCents: 2000, paidCents: 0, status: "PENDING_APPROVAL" }])).toBe(0);
    expect(balance([{ amountCents: 2000, paidCents: 0, status: "OPEN" }])).toBe(2000);
  });

  it("zählt bezahlte und stornierte Strafen nicht", () => {
    expect(
      balance([
        { amountCents: 2000, paidCents: 2000, status: "PAID_CASH" },
        { amountCents: 2000, paidCents: 2000, status: "PAID_PAYPAL" },
        { amountCents: 2000, paidCents: 0, status: "CANCELLED" },
      ]),
    ).toBe(0);
  });

  it("zählt bei Teilzahlung nur den Rest", () => {
    expect(openAmount({ amountCents: 2000, paidCents: 500, status: "PARTIAL" })).toBe(1500);
  });
});

describe("dueDateFrom", () => {
  it("setzt die Fälligkeit 7 Tage nach Freigabe", () => {
    const due = dueDateFrom(new Date("2026-10-28T10:00:00Z"));
    expect(due.toISOString()).toBe("2026-11-04T10:00:00.000Z");
  });
});
