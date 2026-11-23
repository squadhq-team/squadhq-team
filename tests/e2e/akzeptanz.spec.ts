/**
 * Akzeptanztests (Ebene 3): die Kernabläufe von SquadHQ im Browser, aus Sicht von Trainer, Spielern und Kassenwart.
 * Jeder Test entspricht einem Testfall AT-xx in docs/testing/testfallkatalog.md (Eingaben und erwartetes Ergebnis).
 *
 * Die Testfälle bauen aufeinander auf wie ein echter Saisonstart: Trainer gründet ein Team, Spieler treten bei,
 * es gibt ein Training, eine Strafe, eine Zahlung. Deshalb laufen sie nacheinander (mode "serial").
 * „Das Training ist vorbei“ wird hergestellt, indem der Test den Beginn in der Datenbank in die Vergangenheit legt.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_DATABASE_URL } from "../../playwright.config";

test.describe.configure({ mode: "serial" });

const PASSWORT = "Geheim-Test26";
const TEAM = "SV Akzeptanz 1. Herren";
const PERSONEN = {
  trainer: { name: "Tina Trainer", email: "tina@akzeptanz.test" },
  spieler: { name: "Sam Spieler", email: "sam@akzeptanz.test" },
  spielerin: { name: "Pia Spielerin", email: "pia@akzeptanz.test" },
  kasse: { name: "Kai Kasse", email: "kai@akzeptanz.test" },
  fremd: { name: "Fritz Fremd", email: "fritz@akzeptanz.test" },
  fremd2: { name: "Franzi Falschcode", email: "franzi@akzeptanz.test" },
} as const;
type Person = keyof typeof PERSONEN;

const db = new PrismaClient({ datasourceUrl: E2E_DATABASE_URL });
let teamCode = "";

test.afterAll(async () => {
  await db.$disconnect();
});

/** Eigenes Browserfenster je Person, damit mehrere gleichzeitig angemeldet sein können. */
async function neuesFenster(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

async function registrieren(browser: Browser, person: Person, code?: string): Promise<Page> {
  const page = await neuesFenster(browser);
  await page.goto("/registrieren");
  await page.getByLabel("Vor- und Nachname").fill(PERSONEN[person].name);
  await page.getByRole("textbox", { name: /^E-Mail/ }).fill(PERSONEN[person].email);
  await page.getByRole("textbox", { name: /^Passwort Mindestens/ }).fill(PASSWORT);
  await page.getByLabel("Passwort wiederholen").fill(PASSWORT);
  if (code) await page.getByRole("textbox", { name: /^Team-Code/ }).fill(code);
  await page.getByRole("button", { name: "Registrieren" }).click();
  return page;
}

async function anmelden(browser: Browser, person: Person): Promise<Page> {
  const page = await neuesFenster(browser);
  await page.goto("/");
  await page.getByRole("textbox", { name: "E-Mail" }).fill(PERSONEN[person].email);
  await page.getByRole("textbox", { name: "Passwort" }).fill(PASSWORT);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).not.toHaveURL(/\/$/);
  return page;
}

/** Listeneintrag eines Mitglieds (über den Namen als Absatz, nicht über Auswahllisten mit demselben Namen) */
function mitglied(page: Page, name: string) {
  return page.locator("li").filter({ has: page.locator("p", { hasText: name }) });
}

function tageAbHeute(tage: number, uhrzeit: string): string {
  const d = new Date(Date.now() + tage * 24 * 60 * 60 * 1000);
  return `${d.toISOString().slice(0, 10)}T${uhrzeit}`;
}

/** Testvorbereitung „Training ist vorbei“: Beginn eine Stunde in der Vergangenheit */
async function trainingIstVorbei(titel: string) {
  const vorEinerStunde = new Date(Date.now() - 60 * 60 * 1000);
  await db.trainingSession.updateMany({
    where: { title: titel },
    data: { startsAt: vorEinerStunde, responseDeadline: new Date(vorEinerStunde.getTime() - 3 * 60 * 60 * 1000) },
  });
}

async function trainingAnlegen(page: Page, titel: string) {
  await page.goto("/termine/neu");
  await page.getByRole("textbox", { name: /^Titel/ }).fill(titel);
  await page.getByLabel("Beginn", { exact: true }).fill(tageAbHeute(3, "19:00"));
  await page.getByLabel("Ort", { exact: true }).fill("Kunstrasen");
  await page.getByRole("button", { name: "Termin erstellen" }).click();
  await expect(page.getByRole("status")).toHaveText("Termin angelegt.");
}

test("AT-01 Trainer registriert sich und gründet ein Team (AK7)", async ({ browser }) => {
  const page = await registrieren(browser, "trainer");
  await expect(page).toHaveURL(/\/willkommen/);
  await page.getByLabel("Name des Teams").fill(TEAM);
  await page.getByRole("button", { name: "Team gründen" }).click();
  await expect(page.getByRole("link", { name: new RegExp(`SquadHQ ${TEAM}`) })).toBeVisible();

  await page.goto("/team");
  const code = page.locator("p", { hasText: "Team-Code zum Beitreten" }).locator("xpath=following-sibling::p[1]");
  teamCode = (await code.innerText()).trim();
  expect(teamCode).toMatch(/^[A-Z0-9]{6}$/);
  await expect(page.getByRole("heading", { name: "Trainer (1)" })).toBeVisible();
});

test("AT-02 Spieler treten mit dem Team-Code bei, Schreibweise egal (AK7)", async ({ browser }) => {
  // Kleinbuchstaben und Leerzeichen wie beim Abtippen aus WhatsApp
  for (const person of ["spieler", "spielerin", "kasse"] as const) {
    const page = await registrieren(browser, person, ` ${teamCode.toLowerCase()} `);
    await expect(page).toHaveURL(/\/start/);
    await expect(page.getByRole("heading", { name: `Hallo ${PERSONEN[person].name.split(" ")[0]}` })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(TEAM) })).toBeVisible();
  }
  const trainer = await anmelden(browser, "trainer");
  await trainer.goto("/team");
  await expect(trainer.getByRole("heading", { name: "Spieler (3)" })).toBeVisible();
});

test("AT-03 Trainer macht ein Mitglied zum Kassenwart (REQ-SEC-01)", async ({ browser }) => {
  const page = await anmelden(browser, "trainer");
  await page.goto("/team");
  const kai = mitglied(page, PERSONEN.kasse.name);
  await kai.locator("summary").click();
  await kai.getByRole("button", { name: "Kassenwart" }).click();
  await expect(page.getByRole("status")).toHaveText("Rolle geändert.");
  await expect(page.getByRole("heading", { name: "Kassenwart (1)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spieler (2)" })).toBeVisible();
});

test("AT-04 Trainer legt ein Training an, Spieler sagt mit einem Klick zu (MVP-1, REQ-ATT-01)", async ({ browser }) => {
  const trainer = await anmelden(browser, "trainer");
  await trainingAnlegen(trainer, "Dienstagstraining");
  await trainingAnlegen(trainer, "Donnerstagstraining");

  const sam = await anmelden(browser, "spieler");
  await sam.goto("/termine");
  const termin = sam.locator("li").filter({ hasText: "Dienstagstraining" });
  await termin.getByRole("button", { name: "Dabei" }).click();
  await expect(termin.getByRole("button", { name: /Dabei/ })).toHaveAttribute("aria-pressed", "true");
  await expect(termin).toContainText(/1\s*dabei/);

  const pia = await anmelden(browser, "spielerin");
  await pia.goto("/termine");
  await pia.locator("li").filter({ hasText: "Donnerstagstraining" }).getByRole("button", { name: "Dabei" }).click();
  await expect(
    pia.locator("li").filter({ hasText: "Donnerstagstraining" }).getByRole("button", { name: /Dabei/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("AT-05 Unentschuldigt erzeugt einen Strafvorschlag, Trainer gibt ihn frei (MVP-2, MVP-3, AK1, AK2)", async ({
  browser,
}) => {
  await trainingIstVorbei("Dienstagstraining");
  const page = await anmelden(browser, "trainer");
  await page.goto("/termine");
  await page.getByRole("link", { name: /Dienstagstraining/ }).click();

  const sam = page
    .locator("li")
    .filter({ hasText: PERSONEN.spieler.name })
    .filter({
      has: page.getByRole("button", { name: "Unentsch." }),
    });
  await sam.getByRole("button", { name: "Unentsch." }).click();

  const vorschlag = page.locator("li").filter({ hasText: "Pos. 8: Unentschuldigtes Fehlen beim Training" });
  await expect(vorschlag).toContainText(PERSONEN.spieler.name);
  await expect(vorschlag).toContainText("20,00 €");
  await vorschlag.getByRole("button", { name: "Freigeben" }).click();
  await expect(page.getByRole("heading", { name: "Strafvorschläge zur Freigabe" })).toHaveCount(0);

  await page.goto("/kasse");
  await expect(page.locator("li").filter({ hasText: PERSONEN.spieler.name }).first()).toContainText("20,00 €");
});

test("AT-06 Rechte: Trainer verbucht keine Zahlungen, Spieler sieht kein Protokoll (AK9)", async ({ browser }) => {
  const trainer = await anmelden(browser, "trainer");
  await trainer.goto("/kasse");
  await expect(trainer.getByRole("heading", { name: "Offene Forderungen" })).toBeVisible();
  await expect(trainer.getByRole("button", { name: "Bezahlt (bar)" })).toHaveCount(0);

  const sam = await anmelden(browser, "spieler");
  await sam.goto("/protokoll");
  await expect(sam).toHaveURL(/\/start/);
  await sam.goto("/kasse");
  await expect(sam.getByText("Mein Kassenkonto")).toBeVisible();
  await expect(sam.getByRole("heading", { name: "Offene Forderungen" })).toHaveCount(0);
});

test("AT-07 Kassenwart hinterlegt PayPal, Spieler sieht den Bezahllink mit Betrag (#54)", async ({ browser }) => {
  const kai = await anmelden(browser, "kasse");
  await kai.goto("/kasse?ansicht=einstellungen");
  await kai.getByRole("textbox", { name: /PayPal.me-Name/ }).fill("paypal.me/svakzeptanz");
  await kai.getByRole("button", { name: "Speichern" }).click();
  await expect(kai.getByRole("status")).toBeVisible();

  const sam = await anmelden(browser, "spieler");
  await sam.goto("/kasse");
  const link = sam.getByRole("link", { name: "Per PayPal zahlen (20,00 €)" });
  await expect(link).toHaveAttribute("href", "https://paypal.me/svakzeptanz/20.00EUR");
});

test("AT-08 Kassenwart verbucht die Zahlung bar, das Konto des Spielers ist ausgeglichen (MVP-4, MVP-5, AK4)", async ({
  browser,
}) => {
  const kai = await anmelden(browser, "kasse");
  await kai.goto("/kasse");
  const forderung = kai.locator("li").filter({ hasText: "Pos. 8" }).filter({ hasText: PERSONEN.spieler.name });
  await forderung.getByRole("button", { name: "Bezahlt (bar)" }).click();
  await expect(kai.getByRole("heading", { name: "Offene Forderungen" })).toBeVisible();
  await expect(kai.getByText("Keine offenen Strafen oder Beiträge.")).toBeVisible();

  const sam = await anmelden(browser, "spieler");
  await sam.goto("/kasse");
  await expect(sam.getByText("Alles bezahlt. Danke!")).toBeVisible();
  await expect(sam.locator("li").filter({ hasText: "Pos. 8" })).toContainText("Bezahlt (bar)");
});

test("AT-09 Protokoll zeigt jeden Schritt mit Bearbeiter (MVP-6, AK5, AK6)", async ({ browser }) => {
  const kai = await anmelden(browser, "kasse");
  await kai.goto("/protokoll");
  const eintraege = kai.locator("main li");
  // neueste zuerst
  await expect(eintraege.nth(0)).toContainText("Bezahlt verbucht");
  await expect(eintraege.nth(0)).toContainText("Offen → Bezahlt (bar) · von Kai Kasse");
  await expect(eintraege.nth(1)).toContainText("Strafe freigegeben");
  await expect(eintraege.nth(2)).toContainText("Strafe vorgeschlagen");
  await expect(eintraege.nth(3)).toContainText("Anwesenheit gesetzt");
  await expect(eintraege.nth(3)).toContainText("Dabei → Unentschuldigt · von Tina Trainer");
  await expect(kai.locator("main li").filter({ hasText: "Rolle geändert" })).toContainText("Spieler → Kassenwart");
});

test("AT-10 Trainer bewertet, Spielerin sieht nur ihre eigene Bewertung (AK10, AK11)", async ({ browser }) => {
  await trainingIstVorbei("Donnerstagstraining");
  const trainer = await anmelden(browser, "trainer");
  await trainer.goto("/termine");
  await trainer.getByRole("link", { name: /Donnerstagstraining/ }).click();
  await trainer.getByRole("textbox", { name: "Notiz für Pia Spielerin" }).fill("Gutes Passspiel, Kopfball üben");
  await trainer
    .getByRole("group", { name: "Sterne für Pia Spielerin" })
    .getByRole("button", { name: "4 Sterne" })
    .click();
  // Gespeichert: vier Sterne leuchten, und es gibt „Entfernen“ für die Bewertung
  const piaZeile = trainer
    .locator("li")
    .filter({ has: trainer.getByRole("group", { name: "Sterne für Pia Spielerin" }) });
  await expect(piaZeile.getByRole("button", { name: "Entfernen" })).toBeVisible();
  await expect(piaZeile.locator(".text-amber-500")).toHaveCount(4);
  await expect(piaZeile.getByRole("textbox", { name: "Notiz für Pia Spielerin" })).toHaveValue(
    "Gutes Passspiel, Kopfball üben",
  );

  const piaId = (await db.user.findUniqueOrThrow({ where: { email: PERSONEN.spielerin.email } })).id;
  const pia = await anmelden(browser, "spielerin");
  await pia.goto(`/team/statistik/${piaId}`);
  await expect(pia.getByRole("heading", { name: "Meine Leistung" })).toBeVisible();
  await expect(pia.getByText("Gutes Passspiel, Kopfball üben")).toBeVisible();

  // Ein anderer Spieler darf Pias Bewertungen nicht sehen, auch nicht über die direkte Adresse
  const sam = await anmelden(browser, "spieler");
  await sam.goto(`/team/statistik/${piaId}`);
  await expect(sam).toHaveURL(/\/team\/statistik\?ansicht=leistung/);
  await expect(sam.getByText("Gutes Passspiel, Kopfball üben")).toHaveCount(0);
});

test("AT-11 Ein anderes Team sieht nichts von diesem Team (AK8)", async ({ browser }) => {
  const fritz = await registrieren(browser, "fremd");
  await fritz.getByLabel("Name des Teams").fill("FC Nebenan");
  await fritz.getByRole("button", { name: "Team gründen" }).click();
  await expect(fritz.getByRole("link", { name: /SquadHQ FC Nebenan/ })).toBeVisible();

  await fritz.goto("/termine");
  await expect(fritz.getByText("Dienstagstraining")).toHaveCount(0);
  await fritz.goto("/kasse");
  await expect(fritz.getByText(PERSONEN.spieler.name)).toHaveCount(0);
  await fritz.goto("/team");
  await expect(fritz.getByText(PERSONEN.trainer.name)).toHaveCount(0);
  await expect(fritz.getByRole("heading", { name: "Trainer (1)" })).toBeVisible();
});

test("AT-12 Registrierung mit falschem Team-Code wird mit Hinweis abgelehnt (Regressionstest D-03)", async ({
  browser,
}) => {
  const page = await registrieren(browser, "fremd2", "QQ00QQ");
  await expect(page).toHaveURL(/\/registrieren/);
  await expect(page.getByRole("alert").first()).toContainText("Diesen Team-Code gibt es nicht");
  // Es wurde kein Konto angelegt: mit richtigem Code klappt es danach mit derselben E-Mail
  const zweiterVersuch = await registrieren(browser, "fremd2", teamCode);
  await expect(zweiterVersuch).toHaveURL(/\/start/);
});

test("AT-13 Team-Seite zählt in Einzahl richtig (Regressionstest D-02)", async ({ browser }) => {
  const fritz = await anmelden(browser, "fremd");
  await fritz.goto("/team");
  await expect(fritz.getByText("FC Nebenan · 1 Mitglied", { exact: true })).toBeVisible();
});
