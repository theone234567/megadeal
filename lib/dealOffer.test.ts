import { describe, expect, it } from "vitest";
import { dealOffer, nzDate } from "./dealOffer";

const base = { slug: "dinner", now: 59, was: 98, currency: "NZD", inStock: true, expiresAt: "2026-11-05T10:30:00.000Z" };

describe("deal offer for search engines", () => {
  it("gives the last day as a New Zealand date", () => {
    // 10:30 UTC on the 5th is 11:30pm on the 5th in Auckland (NZDT, +13).
    expect(nzDate("2026-11-05T10:30:00.000Z")).toBe("2026-11-05");
    // 11:30 UTC is already the 6th there.
    expect(nzDate("2026-11-05T11:30:00.000Z")).toBe("2026-11-06");
    expect(nzDate(null)).toBeUndefined();
    expect(nzDate("not a date")).toBeUndefined();
  });

  it("carries the usual price as a strikethrough price when it's a real discount", () => {
    const o = dealOffer(base, "https://megadeal.co.nz") as any;
    expect(o).toMatchObject({ price: 59, priceCurrency: "NZD", priceValidUntil: "2026-11-05", url: "https://megadeal.co.nz/deal/dinner", availability: "https://schema.org/InStock" });
    expect(o.priceSpecification[1]).toEqual({ "@type": "UnitPriceSpecification", priceType: "https://schema.org/StrikethroughPrice", price: 98, priceCurrency: "NZD" });
  });

  it("no strikethrough without a saving, and sold out says so", () => {
    const o = dealOffer({ ...base, was: 59, inStock: false }, "https://megadeal.co.nz") as any;
    expect(o.priceSpecification).toBeUndefined();
    expect(o.availability).toBe("https://schema.org/SoldOut");
  });
});
