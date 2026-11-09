/**
 * Unit-Tests für Zahlungen und Fristen (REQ-PEN-03 / MVP-4, REQ-PEN-04 / MVP-5), ohne Datenbank.
 */
import { describe, expect, it } from "vitest";
import { applyPayment, isOverdue, weeksOverdue, type EntryLike } from "@/domain/penalties";
import { parseEuroToCents } from "@/lib/format";

const open: EntryLike = { amountCents: 2000, paidCents: 0, status: "OPEN" };

describe("applyPayment (REQ-PEN-04)", () => {
  it("AK4: 1 Klick bar bezahlt den ganzen Betrag", () => {
    expect(applyPayment(open, "CASH")).toEqual({ status: "PAID_CASH", paidCents: 2000, bookedCents: 2000 });
  });

  it("AK4: 1 Klick PayPal bezahlt den ganzen Betrag", () => {
    expect(applyPayment(open, "PAYPAL").status).toBe("PAID_PAYPAL");
  });

  it("Teilzahlung führt zu PARTIAL, der Rest danach zu bezahlt", () => {
    const first = applyPayment(open, "CASH", 500);
    expect(first).toEqual({ status: "PARTIAL", paidCents: 500, bookedCents: 500 });
    const rest = applyPayment({ ...open, status: first.status, paidCents: first.paidCents }, "PAYPAL");
    expect(rest).toEqual({ status: "PAID_PAYPAL", paidCents: 2000, bookedCents: 1500 });
  });

  it("lehnt zu hohe, leere und negative Beträge ab", () => {
    expect(() => applyPayment(open, "CASH", 2500)).toThrow(/höher/);
    expect(() => applyPayment(open, "CASH", 0)).toThrow();
    expect(() => applyPayment(open, "CASH", -100)).toThrow();
    expect(() => applyPayment(open, "CASH", NaN)).toThrow();
  });

  it.each(["PENDING_APPROVAL", "PAID_CASH", "PAID_PAYPAL", "CANCELLED"] as const)(
    "lehnt Zahlung bei Status %s ab",
    (status) => {
      expect(() => applyPayment({ ...open, status }, "CASH")).toThrow(/nicht offen/);
    },
  );
});

describe("überfällige Strafen (Frist 7 Tage, Mahngebühr nur angezeigt)", () => {
  const now = new Date("2026-11-11T12:00:00Z");
  const day = 24 * 60 * 60 * 1000;

  it("ist nicht überfällig vor Ablauf der Frist", () => {
    const entry = { ...open, dueDate: new Date(now.getTime() + day) };
    expect(isOverdue(entry, now)).toBe(false);
    expect(weeksOverdue(entry, now)).toBe(0);
  });

  it("zählt angefangene Wochen nach Ablauf der Frist", () => {
    expect(weeksOverdue({ ...open, dueDate: new Date(now.getTime() - day) }, now)).toBe(1);
    expect(weeksOverdue({ ...open, dueDate: new Date(now.getTime() - 8 * day) }, now)).toBe(2);
  });

  it("bezahlte Strafen und Strafen ohne Frist sind nie überfällig", () => {
    expect(isOverdue({ ...open, status: "PAID_CASH", dueDate: new Date(0) }, now)).toBe(false);
    expect(isOverdue({ ...open, dueDate: null }, now)).toBe(false);
  });
});

describe("parseEuroToCents (Eingabe Teilzahlung)", () => {
  it.each([
    ["10", 1000],
    ["12,50", 1250],
    ["7.5", 750],
    ["5 €", 500],
  ])("%s → %i Cent", (input, cents) => expect(parseEuroToCents(input)).toBe(cents));

  it.each(["", "abc", "1,234", "-5"])("„%s“ ist ungültig", (input) => expect(parseEuroToCents(input)).toBeNaN());
});
