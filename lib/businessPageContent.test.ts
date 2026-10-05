import { describe, expect, it } from "vitest";
import { businessPageCopy } from "./businessPageContent";
import { listBusinessDesign } from "./siteConfig";

const BANNED = /founder|Nick|free to join|early access|every business approved|credits? table|standard publishing/i;

describe("list-your-business v2 copy", () => {
  it("before launch: the pack's offer, qualifier and six FAQs", () => {
    const c = businessPageCopy(false);
    expect(c.headline).toBe("Advertise your Auckland business. Up to 6 months free.");
    expect(c.offerQualifier).toMatch(/pre-launch/);
    expect(c.launchNote).toMatch(/starts when MegaDeal goes live/);
    expect(c.faqs).toHaveLength(6);
    expect(JSON.stringify(c)).not.toMatch(BANNED);
  });

  it("after launch: no pre-launch offer, the launch offer instead", () => {
    const c = businessPageCopy(true);
    const text = JSON.stringify(c);
    expect(text).not.toMatch(/6 months|six months|pre-launch|before launch/i);
    expect(c.launchNote).toBeNull();
    expect(c.subheading).toMatch(/Up to 3 months/);
    expect(text).not.toMatch(BANNED);
  });
});

describe("LIST_BUSINESS_DESIGN", () => {
  it("is v2 only when exactly 'v2'", () => {
    expect(listBusinessDesign("v2")).toBe("v2");
    for (const v of [undefined, "", "legacy", "V2", "v2 "]) expect(listBusinessDesign(v)).toBe("legacy");
  });
});
