import { describe, expect, it } from "vitest";
import { addressKey, findDuplicates } from "./duplicateBusiness";

// T221: one business, one free allowance.
describe("addressKey", () => {
  it("reads the same street address written two ways as one", () => {
    expect(addressKey("12 Queen Street", "Auckland")).toBe(addressKey("12 queen st.", "AUCKLAND"));
    expect(addressKey("5/20 Ponsonby Road", "Auckland")).toBe("5 20 ponsonby rd auckland");
  });
  it("keeps a different unit or number apart", () => {
    expect(addressKey("Unit 2, 10 Dominion Rd", "Auckland")).not.toBe(addressKey("Unit 3, 10 Dominion Rd", "Auckland"));
  });
  it("has nothing to compare without a street number", () => {
    expect(addressKey("", "Auckland")).toBeNull();
    expect(addressKey("Ponsonby", "Auckland")).toBeNull();
    expect(addressKey(null, undefined)).toBeNull();
  });
});

describe("findDuplicates", () => {
  const cafe = { _id: "a", businessName: "Kai Cafe", status: "Approved", nzbn: "9429000000001", phone: "09 123 4567", contactPhone: "021 123 4567", address: "1 Quay Street", city: "Auckland", referralCode: "MDKAI001" };

  it("finds the same NZBN, a shared phone number (either field) and the same address", () => {
    const again = { _id: "b", nzbn: "9429 0000 00001", phone: "+64 21 123 4567", address: "1 Quay St", city: "Auckland", referredByCode: "mdkai001" };
    expect(findDuplicates(again, [cafe, again])).toEqual([
      { id: "a", name: "Kai Cafe", status: "Approved", reasons: ["same NZBN", "same phone number", "same address", "signed up with its referral code"] },
    ]);
  });
  it("a referral alone isn't a duplicate", () => {
    expect(findDuplicates({ _id: "b", phone: "09 765 4321", referredByCode: "MDKAI001" }, [cafe])).toEqual([]);
  });
  it("ignores test businesses and empty or junk values", () => {
    expect(findDuplicates({ _id: "b", phone: "09 123 4567" }, [{ ...cafe, isTest: true }])).toEqual([]);
    expect(findDuplicates({ _id: "b", isTest: true, phone: "09 123 4567" }, [cafe])).toEqual([]);
    expect(findDuplicates({ _id: "b", nzbn: "", phone: "abc", address: "", city: "Auckland" }, [{ _id: "c", nzbn: "", phone: "abc", address: "", city: "Auckland" }])).toEqual([]);
  });
});
