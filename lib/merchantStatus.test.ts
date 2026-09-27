import { describe, it, expect } from "vitest";
import { statusAfterMerchantEdit } from "./merchant";

describe("statusAfterMerchantEdit", () => {
  const approved = { status: "Approved", businessName: "Harbour Pizza", legalBusinessName: "HP Ltd", nzbn: "9429000000000", category: "Food & Drink", photos: '["a"]', phone: "09 123 4567" };

  it("keeps an approved business approved for everyday edits", () => {
    expect(statusAfterMerchantEdit(approved, { phone: "09 999 9999", businessName: "Harbour Pizza" })).toBe("Approved");
    // Case and surrounding spaces aren't a real change of name.
    expect(statusAfterMerchantEdit(approved, { businessName: " harbour pizza " })).toBe("Approved");
  });

  it("sends an approved business back for review when its identity or photos change", () => {
    expect(statusAfterMerchantEdit(approved, { businessName: "Harbour Pizza & Pasta" })).toBe("Pending");
    expect(statusAfterMerchantEdit(approved, { legalBusinessName: "HP Holdings Ltd" })).toBe("Pending");
    expect(statusAfterMerchantEdit(approved, { nzbn: "9429000000001" })).toBe("Pending");
    expect(statusAfterMerchantEdit(approved, { category: "Things To Do" })).toBe("Pending");
    expect(statusAfterMerchantEdit(approved, { photos: '["b"]' })).toBe("Pending");
  });

  it("a business not yet approved stays pending", () => {
    expect(statusAfterMerchantEdit({ status: "Pending" }, { phone: "1" })).toBe("Pending");
    expect(statusAfterMerchantEdit(null)).toBe("Pending");
  });
  it("never lifts a suspension", () => {
    expect(statusAfterMerchantEdit({ status: "Suspended" })).toBe("Suspended");
    expect(statusAfterMerchantEdit({ ...approved, status: "Suspended" }, { businessName: "New" })).toBe("Suspended");
  });
});
