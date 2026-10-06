/**
 * Brings a database up to date with supabase/migrations: the new
 * MegaDeal database, or a staging copy. See docs/WIX-MIGRATION.md.
 *
 *   DATABASE_URL=… npx tsx scripts/migrate.ts            shows what's applied and what isn't
 *   DATABASE_URL=… npx tsx scripts/migrate.ts --apply    applies what isn't
 *
 * Use the Supabase connection string (Supabase > Connect: the direct
 * connection, or the session pooler on port 5432). Safe to run again:
 * only what's missing is applied, each file whole or not at all.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { applyMigrations, migrationStatus, type MigrationFile } from "../lib/db/migrate";

const apply = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is needed: the database to bring up to date.");
  process.exit(1);
}

// Run from the repository folder, as the other scripts are.
const dir = join(process.cwd(), "supabase", "migrations");
const files: MigrationFile[] = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((file) => ({ file, sql: readFileSync(join(dir, file), "utf8") }));

async function main(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  const db = { query: async (text: string, params?: unknown[]) => (await client.query(text, params as any[])).rows };
  try {
    if (!apply) {
      const s = await migrationStatus(db, files);
      for (const f of s.applied) console.log(`  applied      ${f}`);
      for (const f of s.recognised) console.log(`  already there (set up by hand) ${f}`);
      for (const f of s.pending) console.log(`  to apply     ${f.file}`);
      console.log(s.pending.length ? `\n${s.pending.length} to apply. Run again with --apply.` : "\nUp to date.");
      return;
    }
    const r = await applyMigrations(db, files);
    for (const f of r.recognised) console.log(`  recorded (already there) ${f}`);
    for (const f of r.applied) console.log(`  applied  ${f}`);
    console.log(r.applied.length ? `\nApplied ${r.applied.length}. Up to date.` : "\nNothing to apply. Up to date.");
  } finally {
    await client.end();
  }
}

main(url).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
