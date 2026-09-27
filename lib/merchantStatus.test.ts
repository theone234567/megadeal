import { describe, it, expect } from "vitest";
import { statusAfterMerchantEdit } from "./merchant";

describe("statusAfterMerchantEdit", () => {
  it("sends an edited business back for review", () => {
    expect(statusAfterMerchantEdit({ status: "Approved" })).toBe("Pending");
    expect(statusAfterMerchantEdit({ status: "Pending" })).toBe("Pending");
    expect(statusAfterMerchantEdit(null)).toBe("Pending");
  });
  it("never lifts a suspension", () => {
    expect(statusAfterMerchantEdit({ status: "Suspended" })).toBe("Suspended");
  });
});
