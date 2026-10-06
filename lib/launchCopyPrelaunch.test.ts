import { describe, expect, it, vi } from "vitest";

/** Before launch the pre-launch offer stays exactly as it was (lib/launchCopy.test.ts is the other side). */

vi.mock("@/lib/siteConfig", async (orig) => ({ ...(await orig<typeof import("@/lib/siteConfig")>()), SITE_LAUNCHED: false }));
vi.mock("@/lib/fonts", () => ({ fredoka: { className: "" }, plusJakartaSans: { className: "" }, caveat: { className: "" } }));

describe("before launch", () => {
  it("the business pages still offer up to 6 months", async () => {
    const { metadata } = await import("@/app/advertise/restaurants/page");
    expect(metadata.title).toBe("Restaurant Advertising Auckland | 6 Months Free");
    expect(String(metadata.description)).toContain("Apply before launch for up to six months");
  });

  it("llms.txt still describes the pre-launch offer", async () => {
    const { GET } = await import("@/app/llms.txt/route");
    const text = await (await GET()).text();
    expect(text).toContain("WELCOME6");
  });
});
