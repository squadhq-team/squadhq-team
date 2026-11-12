/**
 * Unit-Tests der Fachlogik aus dem Sprint „Features & Design“: Rechte (REQ-SEC-01), Team-Code, manuelle Strafen (#46),
 * Mahngebühr (#52), Kassenstand (#53), PayPal-Link (#54), Beteiligungsquote (#30), Spielplan-Import.
 */
import { describe, expect, it } from "vitest";
import {
  JOIN_CODE_ALPHABET,
  can,
  generateJoinCode,
  mayRespondFor,
  normalizeJoinCode,
  roleChangeProblem,
} from "@/domain/permissions";
import {
  cashBalance,
  manualPenaltyAmount,
  missingLateFeeWeeks,
  normalizePaypalMe,
  participationRate,
  paypalMeUrl,
} from "@/domain/penalties";
import { parseIcs } from "@/domain/ics";
import { parseBerlinDateTime } from "@/lib/format";

const DAY = 86_400_000;

describe("Rechte (REQ-SEC-01)", () => {
  it("nur der Trainer gibt Strafen frei und verwaltet das Team", () => {
    expect(can("TRAINER", "strafen.freigeben")).toBe(true);
    expect(can("TRAINER", "team.verwalten")).toBe(true);
    for (const r of ["ASSISTANT", "CASHIER", "PLAYER", "GUARDIAN"] as const) {
      expect(can(r, "strafen.freigeben")).toBe(false);
      expect(can(r, "team.verwalten")).toBe(false);
    }
  });

  it("nur der Kassenwart verbucht Zahlungen; Trainer sieht die Kasse nur", () => {
    expect(can("CASHIER", "kasse.buchen")).toBe(true);
    expect(can("TRAINER", "kasse.buchen")).toBe(false);
    expect(can("TRAINER", "kasse.ansehen")).toBe(true);
    expect(can("PLAYER", "kasse.ansehen")).toBe(false);
  });

  it("Betreuer verwaltet Termine und bestätigt Anwesenheit, Spieler nicht", () => {
    expect(can("ASSISTANT", "termine.verwalten")).toBe(true);
    expect(can("ASSISTANT", "anwesenheit.bestaetigen")).toBe(true);
    expect(can("PLAYER", "termine.verwalten")).toBe(false);
  });

  it("Stellvertreter sagt nur für verknüpfte Kader-Mitglieder zu", () => {
    const parent = { id: "p", role: "GUARDIAN" as const };
    expect(mayRespondFor(parent, { id: "k", role: "PLAYER", managedById: "p" })).toBe(true);
    expect(mayRespondFor(parent, { id: "x", role: "PLAYER", managedById: null })).toBe(false);
    expect(mayRespondFor({ id: "s", role: "PLAYER" }, { id: "s", role: "PLAYER", managedById: null })).toBe(true);
    expect(mayRespondFor({ id: "t", role: "TRAINER" }, { id: "t", role: "TRAINER", managedById: null })).toBe(false);
  });

  it("der letzte Trainer kann seine Rolle nicht abgeben", () => {
    expect(roleChangeProblem({ target: { role: "TRAINER" }, newRole: "PLAYER", trainerCount: 1 })).toMatch(
      /mindestens einen Trainer/,
    );
    expect(roleChangeProblem({ target: { role: "TRAINER" }, newRole: "PLAYER", trainerCount: 2 })).toBeNull();
    expect(roleChangeProblem({ target: { role: "PLAYER" }, newRole: "CASHIER", trainerCount: 1 })).toBeNull();
  });
});

describe("Team-Code", () => {
  it("hat 6 Zeichen ohne verwechselbare Zeichen", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(6);
    expect([...code].every((c) => JOIN_CODE_ALPHABET.includes(c))).toBe(true);
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("verzeiht Kleinbuchstaben, Leerzeichen und Bindestriche bei der Eingabe", () => {
    expect(normalizeJoinCode(" k7m-2qx ")).toBe("K7M2QX");
  });
});

describe("#46 manuelle Strafen", () => {
  it("multipliziert den Katalogbetrag mit der Anzahl", () => {
    expect(manualPenaltyAmount({ amountCents: 200, active: true }, 3)).toBe(600);
  });
  it("lehnt inaktive Regeln, Sachstrafen und unsinnige Anzahlen ab", () => {
    expect(() => manualPenaltyAmount({ amountCents: 200, active: false }, 1)).toThrow(/nicht aktiv/);
    expect(() => manualPenaltyAmount({ amountCents: 0, active: true }, 1)).toThrow(/Geldbetrag/);
    expect(() => manualPenaltyAmount({ amountCents: 200, active: true }, 0)).toThrow(/Anzahl/);
  });
});

describe("#52 Mahngebühr", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const entry = (daysOverdue: number) => ({
    amountCents: 2000,
    paidCents: 0,
    status: "OPEN" as const,
    dueDate: new Date(now.getTime() - daysOverdue * DAY),
  });
  it("je angefangener Woche nach der Frist genau eine Gebühr", () => {
    expect(missingLateFeeWeeks(entry(1), [], now)).toEqual([1]);
    expect(missingLateFeeWeeks(entry(8), [], now)).toEqual([1, 2]);
    expect(missingLateFeeWeeks(entry(-1), [], now)).toEqual([]);
  });
  it("bucht schon vorhandene oder erlassene Wochen nicht noch einmal", () => {
    expect(missingLateFeeWeeks(entry(15), [1, 2], now)).toEqual([3]);
  });
  it("nichts bei bezahlten Strafen", () => {
    expect(missingLateFeeWeeks({ ...entry(20), status: "PAID_CASH" as const }, [], now)).toEqual([]);
  });
});

describe("#53 Kassenstand", () => {
  it("Strafen + Einnahmen − Ausgaben, stornierte Buchungen zählen nicht", () => {
    const r = cashBalance(5000, [
      { direction: "INCOME", amountCents: 10000, cancelledAt: null },
      { direction: "EXPENSE", amountCents: 1800, cancelledAt: null },
      { direction: "EXPENSE", amountCents: 9999, cancelledAt: new Date() },
    ]);
    expect(r).toEqual({ incomeCents: 10000, expenseCents: 1800, balanceCents: 13200 });
  });
});

describe("#54 PayPal-Link", () => {
  it.each(["kalle123", "@kalle123", "paypal.me/kalle123", "https://www.paypal.me/kalle123/5EUR"])(
    "liest %s",
    (input) => {
      expect(normalizePaypalMe(input)).toBe("kalle123");
    },
  );
  it("lehnt ungültige Eingaben ab", () => {
    expect(normalizePaypalMe("kalle 123")).toBeNull();
    expect(normalizePaypalMe("https://evil.example/x")).toBeNull();
  });
  it("öffnet PayPal mit dem offenen Betrag", () => {
    expect(paypalMeUrl("kalle123", 2050)).toBe("https://paypal.me/kalle123/20.50EUR");
  });
});

describe("#30 Beteiligungsquote", () => {
  it("bereinigt um Verletzungen", () => {
    const r = participationRate(["ATTENDING", "ATTENDING", "INJURED", "INJURED", "EXCUSED", null]);
    expect(r).toMatchObject({ attended: 2, injured: 2, total: 6 });
    expect(r.rate).toBeCloseTo(2 / 6);
    expect(r.adjustedRate).toBeCloseTo(2 / 4);
  });
  it("ohne Termine keine Quote", () => {
    expect(participationRate([]).rate).toBeNull();
    expect(participationRate(["INJURED"]).adjustedRate).toBeNull();
  });
});

describe("Spielplan-Import (iCalendar)", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:spiel-1@fussball.de",
    "DTSTART:20261115T140000Z",
    "SUMMARY:TSV Kronshagen - TSV Altenholz",
    "LOCATION:Sportplatz Kronshagen\\, Platz 1",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:spiel-2",
    "DTSTART;TZID=Europe/Berlin:20261122T150000",
    "SUMMARY:FC Kiel - TSV Kron",
    " shagen",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  it("liest UID, Titel, Ort und Uhrzeit (UTC und deutsche Ortszeit), sortiert nach Datum", () => {
    const events = parseIcs(ics, parseBerlinDateTime);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      uid: "spiel-1@fussball.de",
      title: "TSV Kronshagen - TSV Altenholz",
      location: "Sportplatz Kronshagen, Platz 1",
    });
    expect(events[0].startsAt.toISOString()).toBe("2026-11-15T14:00:00.000Z");
    expect(events[1].title).toBe("FC Kiel - TSV Kronshagen");
    expect(events[1].startsAt.toISOString()).toBe("2026-11-22T14:00:00.000Z");
  });

  it("liefert nichts bei einer Datei ohne Termine", () => {
    expect(parseIcs("kein Kalender", parseBerlinDateTime)).toEqual([]);
  });
});
