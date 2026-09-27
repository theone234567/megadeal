import { describe, it, expect } from "vitest";
import { unwrapProduct } from "./mapDeal";

describe("unwrapProduct", () => {
  it("reads both SDK shapes", () => {
    // getProductBySlug → { product }
    expect(unwrapProduct({ product: { id: "p1" } })).toEqual({ id: "p1" });
    // getProduct (by id) → the product itself
    expect(unwrapProduct({ id: "p1", name: "x" })).toEqual({ id: "p1", name: "x" });
    expect(unwrapProduct({ _id: "p1" })).toEqual({ _id: "p1" });
  });
  it("returns null for nothing usable", () => {
    expect(unwrapProduct(null)).toBeNull();
    expect(unwrapProduct({})).toBeNull();
  });
});
