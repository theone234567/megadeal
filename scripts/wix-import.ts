/**
 * Loads a Wix export (scripts/wix-export.mjs) into MegaDeal's own database.
 * See docs/WIX-MIGRATION.md.
 *
 *   DATABASE_URL=… npx tsx scripts/wix-import.ts wix-export/<folder>            rehearsal
 *   DATABASE_URL=… npx tsx scripts/wix-import.ts wix-export/<folder> --commit   for real
 *
 * A rehearsal runs the whole import, checks every rule, writes the report
 * and then undoes it all. --replace clears the new database first (only
 * ever for re-running before the switch).
 *
 * The report (import-report.json, next to the export) holds personal
 * details: it stays in the git-ignored export folder.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { importWixExport, type WixExport } from "../lib/db/importWix";

const dir = process.argv[2];
const commit = process.argv.includes("--commit");
const replace = process.argv.includes("--replace");
if (!dir || !existsSync(join(dir, "summary.json"))) {
  console.error("Give the export folder (with summary.json in it), e.g. wix-export/2026-10-07T00-00-00-000Z");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is needed.");
  process.exit(1);
}

const read = (name: string) => (existsSync(join(dir, `${name}.json`)) ? JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8")) : []);
const data: WixExport = {
  Merchants: read("Merchants"),
  Deals: read("Deals"),
  MerchantActivity: read("MerchantActivity"),
  EmailSignups: read("EmailSignups"),
  ContactMessages: read("ContactMessages"),
  SiteSettings: read("SiteSettings"),
  StoresProducts: read("StoresProducts"),
};

async function main(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const report = await importWixExport({ query: async (text, params) => (await client.query(text, params as any[])).rows }, data, { commit, replace });
    writeFileSync(join(dir, "import-report.json"), JSON.stringify(report, null, 2));
    console.log(commit ? "Imported." : "Rehearsal only: nothing was saved. Add --commit to import for real.");
    for (const [name, c] of Object.entries(report.counts)) console.log(`  ${name}: ${c.imported} of ${c.exported}`);
    console.log(`  ${report.issues.length} things to check, ${report.pausedDeals.length} paused deals to confirm: see ${join(dir, "import-report.json")}`);
  } finally {
    await client.end();
  }
}

main(url).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
