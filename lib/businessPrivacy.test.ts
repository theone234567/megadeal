import { describe, expect, it } from "vitest";
import { applyBusinessToDeal, mapMerchantToBusiness } from "./business";
import type { Deal } from "./types";

// A Merchants record carrying every private field a business gives us.
// None of these values may ever reach a public page: the deal and business
// pages, the deal listing (sent to the browser) and their structured data
// are all built from mapMerchantToBusiness / applyBusinessToDeal.
const PRIVATE = {
  email: "owner-private@example.co.nz",
  legalBusinessName: "Secret Holdings Limited",
  nzbn: "9429099999999",
  contactName: "Private Person",
  contactPhone: "021 999 9999",
  postcode: "9999",
  couponCode: "WELCOME6",
  referralCode: "REF-PRIVATE",
  credits: 24,
  status: "Approved",
  adminNotes: "internal note",
};

const merchant = {
  _id: "abc123",
  businessName: "Harbour & Hearth",
  website: "https://example.co.nz",
  phone: "09 123 4567",
  address: "12 Example Street",
  city: "Auckland",
  suburb: "Ponsonby",
  ...PRIVATE,
};

describe("business privacy", () => {
  it("keeps every private field out of the public business", () => {
    const json = JSON.stringify(mapMerchantToBusiness(merchant));
    for (const [field, value] of Object.entries(PRIVATE)) {
      expect(json, field).not.toContain(String(value));
    }
    expect(json).toContain("Harbour & Hearth");
    expect(json).toContain("https://example.co.nz");
  });

  it("keeps every private field off a deal", () => {
    const deal = applyBusinessToDeal({ id: "d1", slug: "d1", name: "Deal" } as unknown as Deal, mapMerchantToBusiness(merchant));
    const json = JSON.stringify(deal);
    for (const [field, value] of Object.entries(PRIVATE)) {
      expect(json, field).not.toContain(String(value));
    }
  });
});
