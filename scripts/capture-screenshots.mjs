#!/usr/bin/env node
/**
 * Captures a full-page screenshot of every (route, viewport) pair below
 * and saves it to screenshot-artifacts/ — nothing more. There is no
 * baseline comparison and no pass/fail here on purpose.
 *
 * Why not real visual-regression assertions (Playwright's own
 * toHaveScreenshot, pixel-diffed against a committed baseline): this
 * project is still in active pre-launch design iteration — this single
 * session shipped roughly a dozen real visual changes — and a strict
 * diff gate sitting in front of the only deploy path would need
 * re-approving after nearly every one of them, or it gets ignored. Two of
 * the five target pages (a live deal, a signed-in portal) also need real
 * Wix data or an authenticated session that CI does not have, so a strict
 * assertion there would fail for reasons that have nothing to do with an
 * actual visual bug — the same failure this project's own CI already
 * has no Wix credentials to avoid.
 *
 * What this buys instead: a screenshot of every page, at every size,
 * attached to every push, for a human to actually look at. That still
 * catches the expensive stuff — a thrown error, a blank page, gross
 * overflow, a broken header — without blocking a wanted change. Once the
 * design has settled (post-launch is the natural point), promoting this
 * into real diffed assertions is a small step from here, not a rewrite.
 *
 * Run against BASE_URL (default: cf:preview's own local server, not
 * `next start`) — cf:preview runs the actual Cloudflare Workers runtime
 * locally, not plain Node. That distinction is not academic: the
 * mascot-art bug fixed alongside this script (see lib/megadealAssets.ts)
 * rendered correctly under `next start` and was broken in production,
 * because the two runtimes disagree about what's available at request
 * time. A screenshot pass against `next start` would have shown the site
 * "working" the whole time that bug was live. cf:preview is the local
 * environment that would actually have caught it.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL || "http://localhost:8787";
const OUT_DIR = process.env.SCREENSHOT_OUT_DIR || "screenshot-artifacts";

/**
 * /deal/example, from the original request, needs a real live deal slug —
 * this project's CI has no Wix credentials at all (deliberately: giving a
 * screenshot job write-capable-adjacent access to the live catalog is a
 * bigger decision than "add some screenshots"), so any real slug would
 * 404 here the same way every Wix-backed read already does in a
 * credential-less environment. /megashop stands in: a real, always-
 * reachable route that (like the deal/portal pages) still exercises the
 * "no live data available" rendering path, which is itself worth a human
 * glancing at.
 */
const ROUTES = ["/", "/coming-soon", "/list-your-business", "/portal", "/megashop"];

const VIEWPORTS = [
  { label: "1440x1200", width: 1440, height: 1200 },
  { label: "1024x1366", width: 1024, height: 1366 },
  { label: "390x844", width: 390, height: 844 },
  { label: "375x667", width: 375, height: 667 },
];

function slugify(route) {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  // executablePath override exists only for local sandbox testing, where a
  // pre-installed Chromium sits at a fixed, non-standard path and running
  // `playwright install` is off-limits. Real CI never sets this: it runs
  // `npx playwright install --with-deps chromium` first, which puts the
  // right build in Playwright's own standard cache location, and
  // chromium.launch() finds it there with no override needed.
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
  const browser = await chromium.launch({ executablePath });
  const results = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    for (const route of ROUTES) {
      const page = await context.newPage();
      const file = join(OUT_DIR, `${slugify(route)}--${viewport.label}.png`);
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
        // Layout settles a beat after networkidle (fonts, late CLS) —
        // consistent with how every manual check this session has done it.
        await page.waitForTimeout(600);
        await page.screenshot({ path: file, fullPage: true });
        results.push({ route, viewport: viewport.label, ok: true, file });
      } catch (err) {
        // Never let one broken page stop the rest — the whole point is a
        // complete set of artifacts for a human to look at, and a single
        // failure is itself useful information, not a reason to abort.
        results.push({ route, viewport: viewport.label, ok: false, error: String(err) });
      } finally {
        await page.close();
      }
    }
    await context.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} screenshots captured to ${OUT_DIR}/`);
  for (const r of results) {
    console.log(r.ok ? `  ok    ${r.route.padEnd(22)} ${r.viewport}` : `  FAIL  ${r.route.padEnd(22)} ${r.viewport}  ${r.error.split("\n")[0]}`);
  }

  // Deliberately exit 0 regardless: this step must never fail the CI run
  // it sits in (see the file header) — a failed page is logged above, not
  // a reason to red the build.
}

main();
