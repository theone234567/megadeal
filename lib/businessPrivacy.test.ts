import { describe, expect, it } from "vitest";
import { applyBusinessToDeal, mapMerchantToBusiness } from "./business";
import { locationNotes } from "./location";
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
  couponCode: "WELCOME6",
  referralCode: "REF-PRIVATE",
  referredByCode: "MDREFPRIV",
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

describe("a business that hides its street address", () => {
  const home = { ...merchant, address: "5A Camelot Place", suburb: "Glenfield", lat: -36.781234, lng: 174.712345, hideAddress: true, serviceArea: "North Shore" };

  it("never shows its street or exact pin: suburb, city, areas covered and a pin to about a kilometre", () => {
    const b = mapMerchantToBusiness(home);
    expect(b).toMatchObject({ address: null, addressHidden: true, suburb: "Glenfield", city: "Auckland", serviceArea: "North Shore", lat: -36.78, lng: 174.71 });
    expect(JSON.stringify(b)).not.toContain("Camelot");
    const deal = applyBusinessToDeal({} as Deal, b);
    expect(deal).toMatchObject({ businessAddress: null, businessAddressHidden: true, businessServiceArea: "North Shore", businessLat: -36.78 });
  });

  it("a business that shows its address keeps it, its postcode and its exact pin", () => {
    expect(mapMerchantToBusiness({ ...home, postcode: "0629", hideAddress: false })).toMatchObject({ address: "5A Camelot Place", postcode: "0629", addressHidden: false, lat: -36.781234, serviceArea: "North Shore" });
    // Hidden: the postcode goes with the street.
    expect(mapMerchantToBusiness({ ...home, postcode: "0629" })).toMatchObject({ address: null, postcode: null });
  });

  it("says where to find it", () => {
    expect(locationNotes(true, null)).toEqual(["Address provided by the business when you book."]);
    expect(locationNotes(true, "North Shore")).toEqual(["Comes to you: covers North Shore."]);
    expect(locationNotes(false, "North Shore")).toEqual(["Also comes to you: covers North Shore."]);
    expect(locationNotes(false, "  ")).toEqual([]);
  });
});

describe("areas a business covers", () => {
  it("ticks Auckland's areas and saves them as plain words", async () => {
    const { areasText, tickedAreas } = await import("./location");
    expect(areasText(["West Auckland", "North Shore"])).toBe("North Shore, West Auckland");
    expect(tickedAreas("North Shore, West Auckland")).toEqual(["North Shore", "West Auckland"]);
    expect(areasText(tickedAreas("All of Auckland")!)).toBe("All of Auckland");
    // Typed text (outside Auckland, or from before) stays as typed.
    expect(tickedAreas("Hamilton and Cambridge")).toBeNull();
    expect(locationNotes(true, "All of Auckland")).toEqual(["Comes to you: covers all of Auckland."]);
  });
});
