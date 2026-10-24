#!/usr/bin/env node
/**
 * Synthetic check (security pack T77): loads the pages a visitor and a
 * business use most in a real browser and fails if one is blank, broken
 * or slow. For a preview deploy or a scheduled job; read-only, it never
 * signs in or submits anything.
 *
 *   node scripts/synthetic-check.mjs https://preview-url.example
 *
 * Checks: /api/health answers ok; home, the Auckland hub, the first live
 * deal (from /feed/deals.json, if there is one) and /portal each return
 * 200 and show a visible H1 within 10 seconds. Exits 1 on any failure,
 * listing what failed.
 *
 * PLAYWRIGHT_EXECUTABLE_PATH: see scripts/capture-screenshots.mjs.
 */
import { chromium } from "playwright";

const base = (process.argv[2] || process.env.SYNTHETIC_BASE_URL || "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: node scripts/synthetic-check.mjs <base URL>");
  process.exit(2);
}
const TIMEOUT_MS = 10_000;
const failures = [];
const ok = (msg) => console.log(`  ok    ${msg}`);
const fail = (msg) => {
  failures.push(msg);
  console.log(`  FAIL  ${msg}`);
};

async function checkHealth() {
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ok === true) ok(`/api/health (${body.ms ?? "?"} ms)`);
    else fail(`/api/health answered ${res.status}: ${JSON.stringify(body)}`);
  } catch (err) {
    fail(`/api/health: ${err.message}`);
  }
}

async function firstDealPath() {
  try {
    const res = await fetch(`${base}/feed/deals.json`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const url = (await res.json())?.deals?.[0]?.url;
    return url ? new URL(url).pathname : null;
  } catch {
    return null;
  }
}

async function checkPage(path) {
  const started = Date.now();
  // A fresh tab for each page, so one page's leftovers can't affect the next.
  const page = await browser.newPage();
  try {
    const res = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    if (!res || res.status() !== 200) return fail(`${path} answered ${res ? res.status() : "nothing"}`);
    const h1 = page.locator("h1").first();
    await h1.waitFor({ state: "attached", timeout: TIMEOUT_MS - (Date.now() - started) });
    const text = (await h1.textContent())?.trim();
    if (!text) return fail(`${path} has an empty H1`);
    // The title can stream in just after the H1.
    const titled = await page.waitForFunction(() => document.title.trim().length > 0, null, { timeout: 3000 }).then(() => true, () => false);
    if (!titled) return fail(`${path} has no <title>`);
    ok(`${path} "${text.slice(0, 50)}" in ${Date.now() - started} ms`);
  } catch (err) {
    fail(`${path}: no H1 within ${TIMEOUT_MS / 1000} s (${err.message.split("\n")[0]})`);
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
try {
  console.log(`Synthetic check of ${base}`);
  await checkHealth();
  const deal = await firstDealPath();
  for (const path of ["/", "/auckland", ...(deal ? [deal] : []), "/portal"]) await checkPage(path);
  if (!deal) console.log("  info  no live deal in the feed, so no deal page was checked");
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
