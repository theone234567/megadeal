import { describe, expect, it, vi } from "vitest";

/**
 * The launch wording (docs/LAUNCH-OFFER-CHECKLIST.md): once the site has
 * launched, nothing a search engine or AI assistant reads about the
 * business offer may still say 6 months, WELCOME6 or "before launch".
 * Loads the pages as they are after launch and checks what they tell
 * search engines; the page bodies were checked by hand when this changed.
 */

vi.mock("@/lib/siteConfig", async (orig) => ({ ...(await orig<typeof import("@/lib/siteConfig")>()), SITE_LAUNCHED: true }));
vi.mock("@/lib/fonts", () => ({ fredoka: { className: "" }, plusJakartaSans: { className: "" }, caveat: { className: "" } }));

const PRE_LAUNCH = /\b6 months\b|six months|WELCOME6|before launch|6 Months/i;

const PAGES = [
  "@/app/advertise/restaurants/page",
  "@/app/advertise/beauty-spa/page",
  "@/app/advertise/home-car/page",
  "@/app/advertise/things-to-do/page",
  "@/app/list-your-business/page",
];

describe("after launch, search engines see the launch offer only", () => {
  for (const path of PAGES) {
    it(path.replace("@/app", "").replace("/page", ""), async () => {
      const { metadata } = await import(/* @vite-ignore */ path);
      const text = JSON.stringify(metadata);
      expect(text).not.toMatch(PRE_LAUNCH);
    });
  }

  it("and it really is the launched page (3 months)", async () => {
    const { metadata } = await import("@/app/advertise/restaurants/page");
    expect(metadata.title).toBe("Restaurant Advertising Auckland | 3 Months Free");
  });

  it("llms.txt", async () => {
    const { GET } = await import("@/app/llms.txt/route");
    const text = await (await GET()).text();
    expect(text).toContain("WELCOME3");
    expect(text).not.toMatch(PRE_LAUNCH);
  });
});
