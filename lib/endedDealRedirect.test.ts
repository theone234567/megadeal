import { describe, expect, it } from "vitest";
import { endedDealRedirect, ENDED_DEAL_PAGE_DAYS } from "./endedDealRedirect";
import { categoryPath } from "./categories";
import { cityPath } from "./cities";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-11-30T00:00:00Z");
const endedDaysAgo = (d: number) => new Date(now - d * DAY).toISOString();

describe("endedDealRedirect", () => {
  it("keeps the ended page for its first 30 days", () => {
    expect(ENDED_DEAL_PAGE_DAYS).toBe(30);
    expect(endedDealRedirect({ expiresAt: endedDaysAgo(1), businessSlug: "cafe" }, true, now)).toBeNull();
    expect(endedDealRedirect({ expiresAt: endedDaysAgo(29.9), businessSlug: "cafe" }, true, now)).toBeNull();
  });

  it("then sends visitors to the business's page while it's listed", () => {
    expect(endedDealRedirect({ expiresAt: endedDaysAgo(30), businessSlug: "harbour-light-espresso-ponsonby" }, true, now)).toBe(
      "/business/harbour-light-espresso-ponsonby"
    );
  });

  it("to the deal's category, or the city, when the business isn't listed", () => {
    const old = endedDaysAgo(45);
    expect(endedDealRedirect({ expiresAt: old, businessSlug: "gone", categories: ["Food & Drink"] }, false, now)).toBe(categoryPath("Food & Drink"));
    expect(endedDealRedirect({ expiresAt: old, businessSlug: "gone", categories: ["Not a category"] }, false, now)).toBe(cityPath());
    expect(endedDealRedirect({ expiresAt: old, businessSlug: null, categories: [] }, true, now)).toBe(cityPath());
  });

  it("leaves a deal with no end in the past alone (paused or taken down early)", () => {
    expect(endedDealRedirect({ expiresAt: null, businessSlug: "cafe" }, true, now)).toBeNull();
    expect(endedDealRedirect({ expiresAt: new Date(now + DAY).toISOString(), businessSlug: "cafe" }, true, now)).toBeNull();
  });
});
