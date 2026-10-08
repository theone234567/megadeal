import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next.js's recommended rules (Core Web Vitals) and its TypeScript rules
// (node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md).
// Run: npm run lint
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Style rather than bugs, and deliberate here: Wix's data and the
      // shim that stands in for it are untyped, and JSX text has apostrophes.
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-unescaped-entities": "off",
      // Worth seeing, but each was looked at (Oct 2026): reading the clock
      // or syncing state in an effect is intended where they appear.
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "wix-export/**",
  ]),
]);
