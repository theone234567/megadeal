import { describe, expect, it } from "vitest";
import { MEMORABLE_CODE_RE, isMemorableCode, memorableCandidate } from "./memorableCode";
import { codeForDraft, dealCodeError, draftNeedsNewCode, isGeneratedDealCode } from "./dealCode";
import { isMegaDealCode, websiteCodeHref } from "./booking";
import { reserveDealCode } from "./db/dealCodes";

describe("memorable deal codes", () => {
  it("are a word for the category plus consonants, nothing confusable", () => {
    for (let i = 0; i < 200; i++) {
      const code = memorableCandidate("Food & Drink");
      expect(code).toMatch(/^(FEAST|TASTE|BITE|DINE|TREAT)[BCDFGHJKMNPRSTVWXZ]{2}$/);
      expect(code.slice(-2)).not.toMatch(/[0-9AEIOULQ]/);
      expect(isMemorableCode(code)).toBe(true);
    }
    expect(memorableCandidate("Unknown")).toMatch(/^(DEAL|TREAT|LOCAL)/);
    expect(memorableCandidate(null, 4)).toMatch(/^[A-Z]+[BCDFGHJKMNPRSTVWXZ]{4}$/);
  });

  it("count as MegaDeal's own, like MEGA- codes, and a business can't choose one", () => {
    expect(isGeneratedDealCode("FEASTKT")).toBe(true);
    expect(isGeneratedDealCode("MEGA-7K2QD")).toBe(true);
    expect(isGeneratedDealCode("SUMMER-20")).toBe(false);
    expect(isMegaDealCode("GLOWBR")).toBe(true);
    expect(dealCodeError("GLOWBR")).toMatch(/MegaDeal makes/);
    // Ordinary business codes are still fine, including ones near the shape.
    for (const ok of ["SPRING", "PIZZA4TWO", "FEAST20", "GLOW-UP", "SUMMER-20"]) expect(dealCodeError(ok), ok).toBeNull();
    // So a MegaDeal code never becomes an "enter it on my website" code.
    expect(websiteCodeHref({ dealCode: "FEASTKT", codeOnWebsite: true, codeWebsiteUrl: "https://x.co.nz" })).toBeNull();
    expect(MEMORABLE_CODE_RE.test("FEASTKTZZZ")).toBe(false);
  });

  it("are never made again for a draft that has one, old or new", () => {
    expect(codeForDraft("", "FEASTKT", "TASTEBB")).toBe("FEASTKT");
    expect(codeForDraft("", "MEGA-7K2QD", "TASTEBB")).toBe("MEGA-7K2QD");
    expect(codeForDraft("", null, "TASTEBB")).toBe("TASTEBB");
    expect(codeForDraft("summer 20", "FEASTKT", "TASTEBB")).toBe("SUMMER-20");
    expect(draftNeedsNewCode("", "FEASTKT")).toBe(false);
    expect(draftNeedsNewCode("", null)).toBe(true);
  });

  it("stay unique: a taken code is skipped, and more letters are used when two run short", async () => {
    const taken = new Set<string>();
    const tried: string[] = [];
    const db = {
      query: async (_sql: string, params?: unknown[]) => {
        const code = String(params?.[0]);
        tried.push(code);
        // The first eight tries all collide.
        if (tried.length <= 8 || taken.has(code)) return [];
        taken.add(code);
        return [{ code }];
      },
    };
    const code = await reserveDealCode(db as any, "Beauty & Spa");
    expect(tried).toHaveLength(9);
    expect(tried.slice(0, 6).every((c) => /^[A-Z]+[BCDFGHJKMNPRSTVWXZ]{2}$/.test(c) && isMemorableCode(c))).toBe(true);
    expect(code).toMatch(/^(GLOW|CALM|BLISS|RELAX)[BCDFGHJKMNPRSTVWXZ]{3}$/);
  });

  it("give up rather than loop forever when nothing is free", async () => {
    const db = { query: async () => [] };
    await expect(reserveDealCode(db as any, "Home & Car")).rejects.toThrow(/No free deal code/);
  });
});
