/**
 * Akzeptanztests im Browser (Playwright): klicken die wichtigsten Abläufe so durch, wie Trainer, Spieler und
 * Kassenwart sie benutzen. Testfälle und erwartete Ergebnisse: docs/testing/testfallkatalog.md (AT-01 bis AT-11).
 *
 * Starten: `npm run test:e2e` (baut die App, startet sie auf Port 3100 und die Supabase-Attrappe auf Port 54321).
 * Datenbank: E2E_DATABASE_URL, Standard ist eine lokale Test-Datenbank `squadhq_e2e`. Sie wird vor jedem Lauf
 * geleert (tests/e2e/globalSetup.ts). Nie die Live-Datenbank verwenden: Das Audit-Log ist unlöschbar.
 */
import { defineConfig, devices } from "@playwright/test";

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/squadhq_e2e";
const APP_PORT = 3100;
const ATTRAPPE_PORT = 54321;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/globalSetup.ts",
  // Die Testfälle bauen aufeinander auf (erst Team gründen, dann beitreten …), deshalb nacheinander
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    // Handy-Ansicht, weil die App vor allem auf dem Handy benutzt wird
    ...devices["iPhone 13"],
    browserName: "chromium",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npx tsx tests/e2e/supabaseAttrappe.ts",
      url: `http://127.0.0.1:${ATTRAPPE_PORT}/auth/v1/health`,
      env: { ATTRAPPE_PORT: String(ATTRAPPE_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npx next start -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        DIRECT_URL: E2E_DATABASE_URL,
        SUPABASE_URL: `http://127.0.0.1:${ATTRAPPE_PORT}`,
        SUPABASE_ANON_KEY: "attrappe",
        SITE_URL: `http://localhost:${APP_PORT}`,
      },
    },
  ],
});
