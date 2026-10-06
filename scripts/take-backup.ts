/**
 * Saves a copy of MegaDeal's own database to a file now, the same as the
 * nightly backup (app/api/cron/backup): for a copy in hand before
 * something big, like the final import. See "Backups" in
 * docs/WIX-MIGRATION.md.
 *
 *   DATABASE_URL=… npx tsx scripts/take-backup.ts                 -> backup-<time>.json.gz
 *   DATABASE_URL=… npx tsx scripts/take-backup.ts my-copy.json.gz
 *
 * The file holds personal details: keep it somewhere private, and delete
 * it when it's no longer needed.
 */
import { writeFileSync } from "node:fs";
import { Client } from "pg";
import { packBackup, takeBackup } from "../lib/db/backup";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is needed: the database to copy.");
  process.exit(1);
}
const now = new Date();
const file = process.argv[2] ?? `backup-${now.toISOString().slice(0, 19).replace(/:/g, "-")}Z.json.gz`;

async function main(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const backup = await takeBackup({ query: async (text, params) => (await client.query(text, params as any[])).rows }, now);
    const bytes = await packBackup(backup);
    writeFileSync(file, bytes);
    console.log(`Saved ${file} (${Math.round(bytes.length / 1024)} KB):`);
    for (const [table, rows] of Object.entries(backup.tables)) console.log(`  ${table}: ${rows.length}`);
  } finally {
    await client.end();
  }
}

main(url).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
