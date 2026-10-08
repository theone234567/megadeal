import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MIGRATION_FILES } from "./migrationFiles";

describe("the migrations the site can apply itself", () => {
  it("are exactly what's in supabase/migrations (else run: node scripts/bundle-migrations.mjs)", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    const onDisk = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((file) => ({ file, sql: readFileSync(join(dir, file), "utf8") }));
    expect(MIGRATION_FILES).toEqual(onDisk);
  });
});
