import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    // bereitet die Test-DB einmal vor allen Dateien vor, statt in jeder Datei parallel (Defekt D-01)
    globalSetup: ["tests/setup/dbGlobalSetup.ts"],
  },
});
