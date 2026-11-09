/**
 * Unit-Tests für Registrierung, Passwörter, Rollen-Navigation und Eingabe der Trainingszeit (P4).
 */
import { describe, expect, it } from "vitest";
import { validateRegistration } from "@/lib/registration";
import { hashPassword, verifyPassword } from "@/lib/password";
import { areasFor, homeFor } from "@/lib/auth";
import { parseBerlinDateTime } from "@/lib/format";

const valid = { name: "Max Muster", email: "max@example.org", password: "geheim123", passwordRepeat: "geheim123" };

describe("validateRegistration", () => {
  it("akzeptiert gültige Eingaben", () => expect(validateRegistration(valid)).toBeNull());
  it("verlangt einen Namen", () => expect(validateRegistration({ ...valid, name: " " })).toMatch(/Namen/));
  it("verlangt eine gültige E-Mail", () => expect(validateRegistration({ ...valid, email: "max" })).toMatch(/E-Mail/));
  it("verlangt mindestens 8 Zeichen", () =>
    expect(validateRegistration({ ...valid, password: "kurz", passwordRepeat: "kurz" })).toMatch(/8 Zeichen/));
  it("verlangt gleiche Passwörter", () =>
    expect(validateRegistration({ ...valid, passwordRepeat: "anders123" })).toMatch(/stimmen nicht/));
});

describe("Passwörter", () => {
  it("speichert nie das Klartext-Passwort und erkennt das richtige Passwort", async () => {
    const stored = await hashPassword("geheim123");
    expect(stored).not.toContain("geheim123");
    expect(await verifyPassword("geheim123", stored)).toBe(true);
    expect(await verifyPassword("falsch123", stored)).toBe(false);
  });

  it("erzeugt für dasselbe Passwort unterschiedliche Hashes (Salt)", async () => {
    expect(await hashPassword("geheim123")).not.toBe(await hashPassword("geheim123"));
  });
});

describe("Rollen und Bereiche (REQ-SEC-01)", () => {
  it("Kassenwart landet in der Teamkasse und sieht Kasse und Protokoll", () => {
    expect(homeFor("CASHIER")).toBe("/kasse");
    expect(areasFor("CASHIER").map((a) => a.href)).toEqual(["/kasse", "/protokoll"]);
  });

  it("Spieler sehen weder Kasse noch Protokoll", () => {
    expect(areasFor("PLAYER").map((a) => a.href)).toEqual(["/spieler"]);
  });
});

describe("parseBerlinDateTime (Training anlegen)", () => {
  it("liest Winterzeit als MEZ (UTC+1)", () => {
    expect(parseBerlinDateTime("2026-11-12T19:00").toISOString()).toBe("2026-11-12T18:00:00.000Z");
  });
  it("liest Sommerzeit als MESZ (UTC+2)", () => {
    expect(parseBerlinDateTime("2026-07-01T19:00").toISOString()).toBe("2026-07-01T17:00:00.000Z");
  });
  it("liefert ein ungültiges Datum bei leerer Eingabe", () => {
    expect(Number.isNaN(parseBerlinDateTime("").getTime())).toBe(true);
  });
});
