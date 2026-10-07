/**
 * Puts a nightly backup (app/api/cron/backup) back into a new, empty
 * database. See "Backups" in docs/WIX-MIGRATION.md.
 *
 *   DATABASE_URL=… npx tsx scripts/restore-backup.ts backups-2026-10-06T14-23-00Z.json.gz            rehearsal
 *   DATABASE_URL=… npx tsx scripts/restore-backup.ts backups-2026-10-06T14-23-00Z.json.gz --commit   for real
 *
 * The database needs the tables first (DATABASE_URL=… npx tsx
 * scripts/migrate.ts --apply) and no data: a restore never mixes with
 * what's there. A
 * rehearsal loads everything, checks it and then undoes it.
 *
 * The backup file holds personal details: delete it when you're done.
 */
import { readFileSync, existsSync } from "node:fs";
import { Client } from "pg";
import { restoreBackup, unpackBackup } from "../lib/db/backup";

const file = process.argv[2];
const commit = process.argv.includes("--commit");
if (!file || !existsSync(file)) {
  console.error("Give the backup file, e.g. backups-2026-10-06T14-23-00Z.json.gz (download it from the BACKUPS bucket in Cloudflare R2).");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is needed: the database to restore into.");
  process.exit(1);
}

async function main(connectionString: string) {
  const backup = await unpackBackup(new Uint8Array(readFileSync(file)));
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { counts, loginsToRelink } = await restoreBackup({ query: async (text, params) => (await client.query(text, params as any[])).rows }, backup, { commit });
    console.log(commit ? `Restored the backup taken ${backup.takenAt}.` : `Rehearsal only: nothing was saved. Add --commit to restore for real. (Backup taken ${backup.takenAt}.)`);
    for (const [table, n] of Object.entries(counts)) console.log(`  ${table}: ${n}`);
    if (loginsToRelink) {
      console.log(`${loginsToRelink} business login(s) aren't in this database: each owner sets a password again ("Forgot password", or Admin > Moving off Wix > Email them a set-password link) and is matched to their business by email.`);
    }
  } finally {
    await client.end();
  }
}

main(url).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
