/**
 * Writes every migration as one script to paste into Supabase's SQL editor,
 * for setting up a new database without a terminal (lib/db/setupSql.ts).
 *
 *   npx tsx scripts/setup-sql.ts megadeal-setup.sql
 *
 * Later updates use scripts/migrate.ts, which sees what this set up.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setupSql } from "../lib/db/setupSql";

const out = process.argv[2];
if (!out) {
  console.error("Say where to write it, e.g. npx tsx scripts/setup-sql.ts megadeal-setup.sql");
  process.exit(1);
}
const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((file) => ({ file, sql: readFileSync(join(dir, file), "utf8") }));
writeFileSync(out, setupSql(files));
console.log(`Wrote ${out}: ${files.length} migrations.`);
