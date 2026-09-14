#!/usr/bin/env node
/**
 * Writes lib/megadealAssetManifest.generated.ts — a plain, static record of
 * which supplied mascot/brand PNGs actually exist in public/megadeal/,
 * with no filesystem access at all in the file it produces.
 *
 * Why this exists: getMegadealArt() used to check fs.existsSync() directly,
 * on the assumption (stated in its own old comment) that it would only
 * ever run at build time on Node, "never in the Workers runtime, where fs
 * does not exist." That held for app/layout.tsx's call — a purely
 * synchronous module with no awaits, prerendered once and never
 * re-executed. It did NOT hold for app/coming-soon/page.tsx's own,
 * separate call to the same function: that page awaits getSignupStats()
 * (a live Wix Data read), which makes it a dynamic/revalidating route —
 * so its top-level getMegadealArt() call genuinely re-runs inside the
 * live Cloudflare Workers runtime on every render. There, fs.existsSync
 * silently fails (caught, returns false) for every asset, and the whole
 * page fell back to the vector illustrations — every single time, not
 * intermittently, which is why a cache purge did nothing: it wasn't
 * cached content, it was the correct output of code that cannot work in
 * that runtime.
 *
 * Run at build time (see the "prebuild" script in package.json) so the
 * manifest it writes is always current for whatever's actually committed
 * to public/megadeal/ at build time — genuinely a build-time fact, now
 * captured as data instead of re-checked live somewhere it can't be.
 */
import { existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "megadeal");
const OUT = join(ROOT, "lib", "megadealAssetManifest.generated.ts");

const ASSETS = {
  logo: "megadeal-logo",
  aucklandCard: "hero-auckland-card",
  mascotBigDeals: "mascot-big-deals",
  mascotWave: "mascot-wave",
  mascotJump: "mascot-jump",
};
const EXTENSIONS = ["png", "webp", "avif"];

function resolve(basename) {
  for (const ext of EXTENSIONS) {
    if (existsSync(join(DIR, `${basename}.${ext}`))) return `/megadeal/${basename}.${ext}`;
  }
  return null;
}

const entries = Object.entries(ASSETS).map(([key, basename]) => [key, resolve(basename)]);
const resolved = Object.fromEntries(entries);

// Same bug, same file, one door over: app/coming-soon/page.tsx had its own
// separate live fs.existsSync check for a real Auckland photo drop at
// public/images/auckland-hero.*, on the identical wrong assumption that the
// page only ever renders at build time. It doesn't — see the long comment
// in lib/megadealAssets.ts. Resolved here the same way, so there is nothing
// left in that file's render path that touches a filesystem at all.
const HERO_PHOTO_DIR = join(ROOT, "public", "images");
function resolveHeroPhoto() {
  for (const ext of ["avif", "webp", "jpg", "jpeg", "png"]) {
    const file = `auckland-hero.${ext}`;
    if (existsSync(join(HERO_PHOTO_DIR, file))) return `/images/${file}`;
  }
  return null;
}
const heroPhoto = resolveHeroPhoto();

const body = `// GENERATED FILE — do not edit by hand.
// Produced by scripts/generate-megadeal-manifest.mjs from what's actually
// in public/megadeal/ and public/images/ at build time. Re-run
// \`npm run build\` (or \`node scripts/generate-megadeal-manifest.mjs\`
// directly) after adding or removing a file there; this file does not
// update itself.
import type { MegadealArt } from "./megadealAssets";

export const MEGADEAL_ART: MegadealArt = ${JSON.stringify(resolved, null, 2)};

/** Real Auckland photography, if public/images/auckland-hero.* exists —
 *  wins over the supplied card art's own fallback chain. See
 *  app/coming-soon/page.tsx. */
export const HERO_PHOTO: string | null = ${JSON.stringify(heroPhoto)};
`;

writeFileSync(OUT, body);
for (const [key, value] of entries) {
  console.log(`[megadeal-manifest] ${key}: ${value ?? "(not supplied — falls back)"}`);
}
