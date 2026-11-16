/**
 * Unit-Tests der Statistik (#65): Leistungsbewertung (Regeln, Schnitt, Trend, Sichtbarkeit),
 * Top-Strafen und Kassenverlauf. Laufen ohne Datenbank.
 */
import { describe, expect, it } from "vitest";
import { can, mayViewRatingsOf } from "@/domain/permissions";
import {
  cashHistory,
  centsFromPaymentNote,
  dayKey,
  ratingProblem,
  ratingSummary,
  topPenalties,
} from "@/domain/statistics";

const DAY = 86_400_000;
const NOW = new Date("2026-11-16T12:00:00Z");
const past = new Date(NOW.getTime() - DAY);

describe("ratingProblem (wann darf bewertet werden?)", () => {
  const ok = {
    eventType: "TRAINING" as const,
    startsAt: past,
    cancelledAt: null,
    attendance: "ATTENDING" as const,
    stars: 4,
  };

  it("erlaubt 1 bis 5 Sterne für Anwesende nach einem Training, Notiz freiwillig", () => {
    for (const stars of [1, 2, 3, 4, 5]) expect(ratingProblem({ ...ok, stars }, NOW)).toBeNull();
    expect(ratingProblem({ ...ok, note: "Laufwege verbessern" }, NOW)).toBeNull();
  });

  it("lehnt 0, 6, Kommazahlen und keine Zahl ab", () => {
    for (const stars of [0, 6, 3.5, Number.NaN]) expect(ratingProblem({ ...ok, stars }, NOW)).toMatch(/1 bis 5 Sterne/);
  });

  it("nur wer dabei war (nicht entschuldigt, unentschuldigt, verletzt oder ohne Antwort)", () => {
    for (const attendance of ["EXCUSED", "UNEXCUSED", "INJURED", "UNSURE", null] as const)
      expect(ratingProblem({ ...ok, attendance }, NOW)).toMatch(/dabei war/);
  });

  it("nicht vor Beginn, nicht bei abgesagtem Training, nicht bei Spielen oder Feiern", () => {
    expect(ratingProblem({ ...ok, startsAt: new Date(NOW.getTime() + DAY) }, NOW)).toMatch(/begonnen/);
    expect(ratingProblem({ ...ok, cancelledAt: past }, NOW)).toMatch(/abgesagt/);
    expect(ratingProblem({ ...ok, eventType: "GAME" }, NOW)).toMatch(/nach einem Training/);
    expect(ratingProblem({ ...ok, eventType: "PARTY" }, NOW)).toMatch(/nach einem Training/);
  });

  it("Notiz höchstens 500 Zeichen (Leerzeichen am Rand zählen nicht)", () => {
    expect(ratingProblem({ ...ok, note: `  ${"a".repeat(500)}  ` }, NOW)).toBeNull();
    expect(ratingProblem({ ...ok, note: "a".repeat(501) }, NOW)).toMatch(/500 Zeichen/);
  });
});

describe("ratingSummary (Schnitt und Trend)", () => {
  const series = (...stars: number[]) => stars.map((s, i) => ({ stars: s, at: new Date(NOW.getTime() + i * DAY) }));

  it("ohne Bewertung keine Aussage", () => {
    expect(ratingSummary([])).toEqual({ count: 0, average: null, recentAverage: null, trend: null });
  });

  it("Schnitt über alle, Schnitt der letzten 3, Trend erst ab 4 Bewertungen", () => {
    const r = ratingSummary(series(2, 3, 4));
    expect(r.count).toBe(3);
    expect(r.average).toBe(3);
    expect(r.recentAverage).toBe(3);
    expect(r.trend).toBeNull();
  });

  it("Trend: letzte 3 gegen die 3 davor, ab 0,5 Sterne Unterschied", () => {
    expect(ratingSummary(series(2, 2, 2, 3, 3, 3)).trend).toBe("UP");
    expect(ratingSummary(series(4, 4, 4, 3, 3, 3)).trend).toBe("DOWN");
    expect(ratingSummary(series(3, 3, 3, 3, 3, 4)).trend).toBe("FLAT"); // +0,33
    expect(ratingSummary(series(1, 1, 1, 1, 5, 5, 5)).trend).toBe("UP"); // nur die 6 neuesten zählen
    expect(ratingSummary(series(2, 4, 4, 4)).trend).toBe("UP"); // 4 Bewertungen: 4,0 gegen 2,0
  });

  it("sortiert nach Datum, egal in welcher Reihenfolge die Bewertungen kommen", () => {
    const shuffled = series(1, 1, 1, 5, 5, 5).reverse();
    expect(ratingSummary(shuffled).recentAverage).toBe(5);
    expect(ratingSummary(shuffled).trend).toBe("UP");
  });
});

describe("Sichtbarkeit der Bewertungen (mayViewRatingsOf)", () => {
  const paul = { id: "paul", role: "PLAYER" as const, managedById: null };
  const tim = { id: "tim", role: "PLAYER" as const, managedById: "mama" };

  it("Trainer und Betreuer bewerten und sehen alle", () => {
    expect(can("TRAINER", "spieler.bewerten")).toBe(true);
    expect(can("ASSISTANT", "spieler.bewerten")).toBe(true);
    expect(mayViewRatingsOf({ id: "t", role: "TRAINER" }, paul)).toBe(true);
    expect(mayViewRatingsOf({ id: "a", role: "ASSISTANT" }, tim)).toBe(true);
  });

  it("ein Spieler sieht nur seine eigenen Bewertungen, nie die eines anderen Spielers", () => {
    expect(mayViewRatingsOf(paul, paul)).toBe(true);
    expect(mayViewRatingsOf(paul, tim)).toBe(false);
    expect(mayViewRatingsOf({ id: "tim", role: "PLAYER" }, paul)).toBe(false);
  });

  it("Stellvertreter sieht die seines Mitglieds; Kassenwart und Spieler bewerten nicht", () => {
    expect(mayViewRatingsOf({ id: "mama", role: "GUARDIAN" }, tim)).toBe(true);
    expect(mayViewRatingsOf({ id: "mama", role: "GUARDIAN" }, paul)).toBe(false);
    expect(mayViewRatingsOf({ id: "k", role: "CASHIER" }, paul)).toBe(false);
    expect(can("CASHIER", "spieler.bewerten")).toBe(false);
    expect(can("PLAYER", "spieler.bewerten")).toBe(false);
  });
});

describe("topPenalties (häufigste Katalogpositionen)", () => {
  const e = (ruleId: string | null, over: Partial<Parameters<typeof topPenalties>[0][number]> = {}) => ({
    kind: "PENALTY" as const,
    status: "OPEN",
    ruleId,
    ruleTitle: `Regel ${ruleId}`,
    quantity: 1,
    amountCents: 200,
    ...over,
  });

  it("zählt Anzahl (mit Stückzahl) und Summe je Regel, sortiert nach Anzahl", () => {
    const top = topPenalties([
      e("8", { amountCents: 2000 }),
      e("3", { quantity: 3, amountCents: 600 }),
      e("8", { amountCents: 2000, status: "PAID_CASH" }),
    ]);
    expect(top).toEqual([
      { ruleId: "3", title: "Regel 3", count: 3, totalCents: 600 },
      { ruleId: "8", title: "Regel 8", count: 2, totalCents: 4000 },
    ]);
  });

  it("ohne Vorschläge, stornierte Strafen, Mahngebühren, Beiträge und Strafen ohne Regel", () => {
    expect(
      topPenalties([
        e("8", { status: "PENDING_APPROVAL" }),
        e("8", { status: "CANCELLED" }),
        e("8", { kind: "LATE_FEE" }),
        e("8", { kind: "FEE" }),
        e(null),
      ]),
    ).toEqual([]);
  });

  it("bei gleicher Anzahl entscheidet die Summe, höchstens `limit` Einträge", () => {
    const top = topPenalties([e("a", { amountCents: 100 }), e("b", { amountCents: 500 }), e("c")], 2);
    expect(top.map((t) => t.ruleId)).toEqual(["b", "c"]);
  });
});

describe("centsFromPaymentNote (ältere Zahlungen im Protokoll)", () => {
  it("liest den Betrag aus dem Protokolltext", () => {
    expect(centsFromPaymentNote("20,00 € bar")).toBe(2000);
    expect(centsFromPaymentNote("7,50 € per PayPal")).toBe(750);
    expect(centsFromPaymentNote("1.234,56 € bar")).toBe(123456);
    expect(centsFromPaymentNote("1.234,56 € bar")).toBe(123456); // geschütztes Leerzeichen aus Intl
  });

  it("null ohne erkennbaren Betrag", () => {
    expect(centsFromPaymentNote(null)).toBeNull();
    expect(centsFromPaymentNote("bar")).toBeNull();
  });
});

describe("cashHistory (Kassenverlauf)", () => {
  const at = (iso: string) => new Date(iso);

  it("Kassenstand nach jedem Tag, Bewegungen eines Tages zusammengefasst, Ende = Kassenstand", () => {
    const h = cashHistory(
      [
        { at: at("2026-11-03T18:00:00Z"), cents: 2000 },
        { at: at("2026-11-01T18:00:00Z"), cents: 2000 },
        { at: at("2026-11-03T19:00:00Z"), cents: -1800 },
      ],
      2200,
    );
    expect(h.startCents).toBe(0);
    expect(h.points.map((p) => [p.day, p.deltaCents, p.balanceCents])).toEqual([
      ["2026-11-01", 2000, 2000],
      ["2026-11-03", 200, 2200],
    ]);
  });

  it("Tagesgrenze in Berliner Zeit: 23:30 Uhr UTC am 1.11. ist schon der 2.11.", () => {
    expect(dayKey(at("2026-11-01T23:30:00Z"))).toBe("2026-11-02");
  });

  it("nicht zuordenbare Beträge landen im Startwert, damit Verlauf und Teamkasse übereinstimmen", () => {
    const h = cashHistory([{ at: at("2026-11-05T12:00:00Z"), cents: 500 }], 3000);
    expect(h.startCents).toBe(2500);
    expect(h.points.at(-1)?.balanceCents).toBe(3000);
  });

  it("ohne Bewegungen keine Punkte", () => {
    expect(cashHistory([], 0)).toEqual({ startCents: 0, points: [] });
  });
});
