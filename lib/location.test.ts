import { describe, expect, it } from "vitest";
import { businessSuburb, placeLabel } from "./location";

describe("businessSuburb", () => {
  it("uses the suburb saved with the address", () => {
    expect(businessSuburb(" Takapuna ", "5A Camelot Place", "Auckland")).toBe("Takapuna");
  });

  it("reads it out of a full Google-style address", () => {
    expect(businessSuburb(null, "12 Hurstmere Road, Takapuna, Auckland 0622", "Auckland")).toBe("Takapuna");
    expect(businessSuburb("", "Unit 3, 12 Hurstmere Road, Takapuna, Auckland 0622", "Auckland")).toBe("Takapuna");
    // A suburb named after the city isn't mistaken for the city.
    expect(businessSuburb(null, "1 Queen Street, Auckland CBD, Auckland 1010", "Auckland")).toBe("Auckland CBD");
  });

  it("doesn't guess when there's nothing to go on", () => {
    expect(businessSuburb(null, "5A Camelot Place", "Auckland")).toBeNull();
    // Only a street before the city: the street is not a suburb.
    expect(businessSuburb(null, "Hurstmere Road, Auckland 0622", "Auckland")).toBeNull();
    expect(businessSuburb(null, "12 Hurstmere Road, Takapuna, Auckland 0622", null)).toBeNull();
    expect(businessSuburb(null, null, "Auckland")).toBeNull();
  });
});

describe("placeLabel", () => {
  it("names the suburb and the city", () => {
    expect(placeLabel("Takapuna", "Auckland")).toBe("Takapuna, Auckland");
  });
  it("doesn't repeat the city when the suburb names it", () => {
    expect(placeLabel("Auckland CBD", "Auckland")).toBe("Auckland CBD");
  });
  it("uses whichever is known", () => {
    expect(placeLabel(null, "Auckland")).toBe("Auckland");
    expect(placeLabel("Takapuna", "")).toBe("Takapuna");
    expect(placeLabel(null, null)).toBeNull();
  });
});
