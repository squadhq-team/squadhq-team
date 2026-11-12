/**
 * Unit-Tests für Registrierung, Fehlermeldungen von Supabase Auth,
 * Startseite nach der Anmeldung und Eingabe der Trainingszeit.
 */
import { describe, expect, it } from "vitest";
import { translateAuthError, validateNewPassword, validateRegistration } from "@/lib/registration";
import { homeFor } from "@/lib/auth";
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

describe("validateNewPassword (Passwort vergessen)", () => {
  it("akzeptiert gleiche Passwörter ab 8 Zeichen", () =>
    expect(validateNewPassword("geheim123", "geheim123")).toBeNull());
  it("lehnt zu kurze Passwörter ab", () => expect(validateNewPassword("kurz", "kurz")).toMatch(/8 Zeichen/));
});

describe("translateAuthError (Meldungen von Supabase Auth auf Deutsch)", () => {
  it.each([
    ["Invalid login credentials", /falsch/],
    ["Email not confirmed", /bestätige/],
    ["User already registered", /schon ein Konto/],
    ["email rate limit exceeded", /Zu viele/],
    ["something unexpected", /nicht geklappt/],
  ])("%s", (input, expected) => expect(translateAuthError(input)).toMatch(expected));
});

describe("Startseite nach der Anmeldung", () => {
  it("ohne Team geht es zum Gründen bzw. Beitreten, mit Team zur Übersicht", () => {
    expect(homeFor({ teamId: null })).toBe("/willkommen");
    expect(homeFor({ teamId: "t1" })).toBe("/start");
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
