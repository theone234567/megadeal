import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Unit tests for the pure logic only — no Wix, no network, no React.
 *
 * The functions covered here are the ones where a quiet mistake does real
 * damage and nothing else would catch it: terms that get rewritten behind
 * a merchant's back, a draft that loses fields on the way back out, a deal
 * that publishes itself, a query that reads the first page and calls it
 * the whole collection. Every case in these files is a bug that actually
 * happened in this codebase, not an invented one.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
