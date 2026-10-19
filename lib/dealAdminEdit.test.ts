import { describe, it, expect } from "vitest";
import { buildProductUpdate, parseAdminContentEdit, textToHtml, withHistory } from "./dealAdminEdit";
import { allowedDealActions, withdrawalRefundsCredit } from "./dealStatus";
import { renderTerms } from "./dealTerms";

const row = {
  dealName: "Pizza for two",
  description: "Two pizzas.",
  terms: "Dine-in only.",
  priceNow: 49,
  priceWas: 70,
  bookingRequirement: "required",
  quantityAvailable: null,
};

describe("parseAdminContentEdit", () => {
  it("refuses a price more than the database can hold", () => {
    expect(parseAdminContentEdit({ priceNow: 9e9 }, row).error).toBe("That price is too high. Check the number and try again.");
    expect(parseAdminContentEdit({ priceWas: "100000000" }, row).error).toBe("That price is too high. Check the number and try again.");
  });

  it("returns only the fields that change", () => {
    const { changes, error } = parseAdminContentEdit({ dealName: "Pizza for two", priceNow: "45" }, row);
    expect(error).toBeNull();
    expect(changes).toEqual({ priceNow: 45 });
  });

  it("keeps 'no comparison price' when the price changes", () => {
    const { changes } = parseAdminContentEdit({ priceNow: 30 }, { ...row, priceNow: 40, priceWas: 40 });
    expect(changes).toEqual({ priceNow: 30, priceWas: 30 });
  });

  it("an empty usual price means no comparison", () => {
    expect(parseAdminContentEdit({ priceWas: "" }, row).changes).toEqual({ priceWas: 49 });
  });

  it("rejects a usual price below the deal price", () => {
    expect(parseAdminContentEdit({ priceWas: 40 }, row).error).toMatch(/can't be lower/);
    expect(parseAdminContentEdit({ priceNow: 80 }, row).error).toMatch(/can't be lower/);
  });

  it("rejects invalid values", () => {
    expect(parseAdminContentEdit({ dealName: "" }, row).error).toMatch(/1–80/);
    expect(parseAdminContentEdit({ dealName: "x".repeat(81) }, row).error).toMatch(/1–80/);
    expect(parseAdminContentEdit({ priceNow: 0 }, row).error).toMatch(/more than/);
    expect(parseAdminContentEdit({ bookingRequirement: "maybe" }, row).error).toMatch(/book/);
    expect(parseAdminContentEdit({ quantityAvailable: 2.5 }, row).error).toMatch(/whole number/);
  });

  it("ignores requests with no content fields, even on inconsistent stored data", () => {
    expect(parseAdminContentEdit({ status: "Live" }, { ...row, priceWas: 10 })).toEqual({ changes: {}, error: null });
  });

  it("applies the booking/conditions conflict check to the edited result", () => {
    const withEssential = { ...row, terms: renderTerms(["bookings"], "") };
    expect(parseAdminContentEdit({ bookingRequirement: "not_required" }, withEssential).error).toMatch(
      /Change one of them/
    );
  });
});

describe("withHistory", () => {
  it("records the replaced values, newest first, capped", () => {
    const prior = Array.from({ length: 30 }, (_, i) => ({ at: `t${i}`, previous: {} }));
    const h = withHistory({ ...row, contentHistory: prior }, ["priceNow", "dealName"], "now");
    expect(h[0]).toEqual({ at: "now", previous: { priceNow: 49, dealName: "Pizza for two" } });
    expect(h).toHaveLength(25);
  });
});

describe("buildProductUpdate", () => {
  const product = {
    id: "p1",
    revision: "3",
    options: [],
    variantsInfo: { variants: [{ id: "v1", choices: [], price: {} }] },
  };

  it("sends the name and escaped description with the revision", () => {
    const body = buildProductUpdate(product, { dealName: "New", description: "A & B\n\n<b>" }, { priceNow: 1, priceWas: 1 });
    expect(body).toEqual({
      product: { id: "p1", revision: "3", name: "New", plainDescription: "<p>A &amp; B</p><p>&lt;b&gt;</p>" },
    });
  });

  it("sends the single variant back with its id and both prices", () => {
    const body: any = buildProductUpdate(product, { priceNow: 45 }, { priceNow: 45, priceWas: 70 });
    expect(body.product.options).toEqual([]);
    expect(body.product.variantsInfo.variants).toEqual([
      { id: "v1", choices: [], price: { actualPrice: { amount: "45" }, compareAtPrice: { amount: "70" } } },
    ]);
  });

  it("refuses to rewrite a product with several variants", () => {
    const multi = { ...product, variantsInfo: { variants: [{ id: "a" }, { id: "b" }] } };
    expect(() => buildProductUpdate(multi, { priceNow: 1 }, { priceNow: 1, priceWas: 1 })).toThrow(/Wix dashboard/);
  });

  it("returns null when nothing on the product changes", () => {
    expect(buildProductUpdate(product, { terms: "x" }, { priceNow: 1, priceWas: 1 })).toBeNull();
  });

  it("textToHtml keeps single line breaks", () => {
    expect(textToHtml("a\nb")).toBe("<p>a<br>b</p>");
  });
});

describe("business actions", () => {
  it("businesses can pause, resume and cancel but never edit or approve", () => {
    expect(allowedDealActions("Live").map((a) => a.target)).toEqual(["Paused", "Cancelled"]);
    expect(allowedDealActions("Paused").map((a) => a.target)).toEqual(["Live", "Cancelled"]);
    expect(allowedDealActions("Pending Approval").map((a) => a.target)).toEqual(["Cancelled"]);
  });

  it("refunds a withdrawal only for a deal that was never live", () => {
    expect(withdrawalRefundsCredit({ status: "Pending Approval" })).toBe(true);
    expect(withdrawalRefundsCredit({ status: "Live" })).toBe(false);
    expect(withdrawalRefundsCredit({ status: "Pending Approval", everLive: true })).toBe(false);
    expect(withdrawalRefundsCredit({ status: "Pending Approval", creditRefunded: true })).toBe(false);
    expect(withdrawalRefundsCredit({ status: "Pending Approval", viewCount: 3 })).toBe(false);
  });
});

describe("tags", () => {
  it("changes tags only when the list really changes, dropping unknown ones", () => {
    expect(parseAdminContentEdit({ tags: ["kids", "nope"] }, { ...row, tags: ["kids"] }).changes).toEqual({});
    expect(parseAdminContentEdit({ tags: ["groups", "kids"] }, { ...row, tags: ["kids"] }).changes).toEqual({ tags: ["kids", "groups"] });
    expect(parseAdminContentEdit({ tags: [] }, { ...row, tags: ["kids"] }).changes).toEqual({ tags: [] });
  });

  it("refuses walk-ins on a deal that needs booking", () => {
    expect(parseAdminContentEdit({ tags: ["walk-ins-welcome"] }, row).error).toMatch(/Walk-ins welcome/);
  });
});

describe("more photos", () => {
  const own = (n: string) => `https://megadeal.co.nz/media/photos/2026-10/${n}.jpg`;
  const withPhoto = { ...row, photoUrl: own("main"), gallery: [own("a"), own("b")] };
  it("changes only when the list really changes, and keeps the order", () => {
    expect(parseAdminContentEdit({ gallery: [own("a"), own("b")] }, withPhoto).changes).toEqual({});
    expect(parseAdminContentEdit({ gallery: [own("b")] }, withPhoto).changes).toEqual({ gallery: [own("b")] });
  });
  it("refuses a photo that wasn't uploaded to MegaDeal", () => {
    expect(parseAdminContentEdit({ gallery: ["https://evil.example/x.jpg"] }, withPhoto).error).toMatch(/uploaded to MegaDeal/);
  });
});
