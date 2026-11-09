// ESLint-Konfiguration (Flat Config). Regeln und Begründung: docs/coding-guidelines.md
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  { ignores: ["node_modules/**", ".next/**", ".vercel/**", "coverage/**", "next-env.d.ts"] },
  // Next.js-Empfehlungen inkl. React-Hooks-Regeln und TypeScript
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Formatierung macht Prettier, ESLint prüft nur Fehler und Codequalität
  ...compat.extends("prettier"),
  {
    rules: {
      // Kein any: Typen sollen sagen, was ankommt
      "@typescript-eslint/no-explicit-any": "error",
      // Unbenutzte Variablen sind meist Reste; mit _ am Anfang bewusst erlaubt
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Typ-Importe als "import type", damit klar ist, was nur zur Prüfung gebraucht wird
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      // Immer === statt ==
      eqeqeq: ["error", "always"],
      // console.log nicht im fertigen Code, Fehlermeldungen (console.error/warn) sind erlaubt
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "prefer-const": "error",
    },
  },
  // Schichtenregeln (docs/architektur/namensliste.md): jede Schicht greift nur auf die darunterliegende zu.
  // Reine Typ-Importe ("import type") sind erlaubt, weil sie nach dem Kompilieren verschwinden.
  {
    // Schicht 1+2 (Seiten, Server Actions, UI-Bausteine): kein direkter Zugriff auf Datenbank oder Fachregeln
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@prisma/client", "@/domain/*"],
              allowTypeImports: true,
              message:
                "Seiten und Actions rufen einen Service auf (src/services), nicht Datenbank oder Fachregeln direkt.",
            },
          ],
        },
      ],
    },
  },
  {
    // Schicht 3 (Services): kennen keine Seiten, Actions oder UI
    files: ["src/services/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/components/*", "next/*"],
              message: "Services sind unabhängig von Next.js und der Oberfläche.",
            },
          ],
        },
      ],
    },
  },
  {
    // Schicht 4 (Fachlogik): reine Funktionen ohne Datenbank, Framework oder Services, damit sie unit-testbar bleiben
    files: ["src/domain/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/*", "@prisma/client", "@/services/*", "@/app/*", "@/components/*", "next/*", "react"],
              message: "Fachlogik ist reines TypeScript ohne Datenbank, Framework oder Services.",
            },
          ],
        },
      ],
    },
  },
  {
    // Skripte für Datenbank und Demo-Daten dürfen auf der Konsole ausgeben
    files: ["prisma/**/*.ts"],
    rules: { "no-console": "off" },
  },
];

export default eslintConfig;
