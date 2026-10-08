#!/usr/bin/env node
/**
 * Read-only export of everything MegaDeal keeps in Wix, for the move to
 * its own database (docs/WIX-MIGRATION.md). It never writes to Wix.
 *
 *   WIX_API_KEY=… WIX_SITE_ID=… node scripts/wix-export.mjs [outDir]
 *
 * (or put both in .dev.vars, which it reads if they're not in the
 * environment). Writes one JSON file per Wix collection, plus every
 * Stores product, into outDir (default wix-export/<timestamp>/), and a
 * summary.json of counts to compare with the import later.
 *
 * The output holds businesses' and subscribers' personal details:
 * wix-export/ is git-ignored, and it should be deleted once the move is
 * done and checked.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import { productsV3 } from "@wix/stores";

const COLLECTIONS = ["Merchants", "Deals", "MerchantActivity", "EmailSignups", "ContactMessages", "ApiUsageCounters", "SiteSettings"];
const PAGE_SIZE = 100;
const MAX_PAGES = 10_000; // a backstop against a paging bug, not a real limit

function loadDevVars() {
  if (!existsSync(".dev.vars")) return {};
  const vars = {};
  for (const line of readFileSync(".dev.vars", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m) vars[m[1]] = m[2];
  }
  return vars;
}

const devVars = loadDevVars();
const apiKey = process.env.WIX_API_KEY || devVars.WIX_API_KEY;
const siteId = process.env.WIX_SITE_ID || devVars.WIX_SITE_ID;
if (!apiKey || !siteId) {
  console.error("WIX_API_KEY and WIX_SITE_ID are needed (environment or .dev.vars).");
  process.exit(1);
}

const client = createClient({ modules: { items, productsV3 }, auth: ApiKeyStrategy({ apiKey, siteId }) });

async function exportCollection(name) {
  const all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await client.items.query(name).limit(PAGE_SIZE).skip(page * PAGE_SIZE).find();
    const rows = result.items ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return all;
  }
  throw new Error(`${name}: more than ${MAX_PAGES} pages, stopped`);
}

async function exportProducts() {
  const all = [];
  let cursor = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    // The search and the extra details are separate arguments to the SDK.
    const res = await client.productsV3.searchProducts(cursor ? { cursorPaging: { cursor } } : { cursorPaging: { limit: PAGE_SIZE } }, {
      fields: ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO", "PLAIN_DESCRIPTION"],
    });
    all.push(...(res?.products ?? []).filter(Boolean));
    const meta = res?.pagingMetadata;
    cursor = meta?.hasNext ? (meta?.cursors?.next ?? null) : null;
    if (!cursor) return all;
  }
  throw new Error(`Products: more than ${MAX_PAGES} pages, stopped`);
}

const outDir = process.argv[2] || join("wix-export", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(outDir, { recursive: true });

const summary = { exportedAt: new Date().toISOString(), siteId, counts: {}, failed: {} };

for (const name of COLLECTIONS) {
  try {
    const rows = await exportCollection(name);
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify(rows, null, 2));
    summary.counts[name] = rows.length;
    console.log(`${name}: ${rows.length}`);
  } catch (err) {
    // A collection that doesn't exist (e.g. never used) isn't fatal; the
    // summary says which, so nothing is assumed to have been exported.
    summary.failed[name] = String(err?.message || err);
    console.error(`${name}: failed — ${summary.failed[name]}`);
  }
}

try {
  const products = await exportProducts();
  writeFileSync(join(outDir, "StoresProducts.json"), JSON.stringify(products, null, 2));
  summary.counts.StoresProducts = products.length;
  console.log(`StoresProducts: ${products.length}`);
} catch (err) {
  summary.failed.StoresProducts = String(err?.message || err);
  console.error(`StoresProducts: failed — ${summary.failed.StoresProducts}`);
}

writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
console.log(`\nSaved to ${outDir}. It holds personal details: keep it private and delete it after the move.`);
if (Object.keys(summary.failed).length) process.exitCode = 1;
