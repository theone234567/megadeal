import { describe, it, expect, vi } from "vitest";

/**
 * This is the bug that actually happened, codified so it can't happen
 * again by accident.
 *
 * getMegadealArt() used to call fs.existsSync() directly, live, every time
 * it ran — correct for app/layout.tsx's own call (a purely synchronous
 * module, prerendered once, never re-executed), but wrong for
 * app/coming-soon/page.tsx's separate call to the same function: that page
 * awaits getSignupStats(), a live Wix Data read, which makes it a
 * dynamic/revalidating route whose top-level code genuinely re-runs inside
 * the live Cloudflare Workers runtime on every render. fs silently failed
 * there — caught, not thrown — so every supplied mascot illustration
 * quietly reverted to its SVG fallback on the deployed site while working
 * perfectly in every local check, including a full production build run
 * locally. A Cloudflare cache purge did nothing, because it wasn't stale
 * content: it was the correct output of code that could not run where it
 * was running, every single time.
 *
 * vi.mock throws on any node:fs / node:path call: if either of these
 * modules ever imports one again — directly, or transitively — this test
 * fails immediately, in CI, before it can reach production a second time.
 */
vi.mock("node:fs", () => {
  throw new Error("lib/megadealAssets.ts must not touch the filesystem at runtime");
});
vi.mock("node:path", () => {
  throw new Error("lib/megadealAssets.ts must not touch the filesystem at runtime");
});

describe("getMegadealArt", () => {
  it("resolves every supplied asset without touching fs or path", async () => {
    const { getMegadealArt } = await import("./megadealAssets");
    const art = getMegadealArt();

    // Values, not just "didn't throw": a version of this bug that quietly
    // returned all-null while still avoiding fs would pass a weaker test
    // and still ship a page full of SVG fallbacks.
    expect(art.logo).toBe("/megadeal/megadeal-logo.png");
    expect(art.aucklandCard).toBe("/megadeal/hero-auckland-card.png");
    expect(art.mascotBigDeals).toBe("/megadeal/mascot-big-deals.png");
    expect(art.mascotWave).toBe("/megadeal/mascot-wave.png");
    expect(art.mascotJump).toBe("/megadeal/mascot-jump.png");
  });

  it("HERO_PHOTO resolves the same way, for the same reason", async () => {
    // app/coming-soon/page.tsx had an identical, independent fs check for
    // a real Auckland photo drop — same bug, same file, fixed the same way.
    const { HERO_PHOTO } = await import("./megadealAssetManifest.generated");
    // Currently null (no file supplied) — asserting the type/shape rather
    // than a specific path, since this one's presence is data-dependent.
    expect(HERO_PHOTO === null || typeof HERO_PHOTO === "string").toBe(true);
  });
});
