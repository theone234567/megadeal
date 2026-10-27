import { afterEach, describe, expect, it, vi } from "vitest";

// The "up to 50% off" claim stays off after launch until the owner turns
// it on (lib/siteConfig.ts SAVING_CLAIM_LIVE): an "up to" saving has to be
// backed by real deals on every page that makes it (Fair Trading Act).
describe("the saving claim", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("isn't made after launch until it's turned on", async () => {
    vi.stubEnv("SITE_LAUNCHED", "true");
    vi.resetModules();
    const c = await import("./siteConfig");
    expect(c.SITE_LAUNCHED).toBe(true);
    expect(c.SAVING_CLAIM_ON).toBe(false);
    expect(c.SAVING_CLAIM).toBe("");
    for (const text of [c.SITE_TAGLINE, c.SITE_DESCRIPTION]) expect(text).not.toMatch(/\d+ ?%/);
    // Launched wording, not the "launching in Auckland" line.
    expect(c.SITE_DESCRIPTION).not.toMatch(/launching/i);
  });

  it("isn't made before launch", async () => {
    vi.stubEnv("SITE_LAUNCHED", "false");
    vi.resetModules();
    const c = await import("./siteConfig");
    expect(c.SAVING_CLAIM_ON).toBe(false);
    for (const text of [c.SAVING_CLAIM, c.SITE_TAGLINE, c.SITE_DESCRIPTION]) expect(text).not.toMatch(/\d+ ?%/);
  });
});
