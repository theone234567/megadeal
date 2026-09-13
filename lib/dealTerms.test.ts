import { describe, it, expect } from "vitest";
import { STANDARD_TERMS, renderTerms, parseTerms } from "./dealTerms";

describe("renderTerms", () => {
  it("joins the ticked conditions into one sentence", () => {
    expect(renderTerms(["bookings", "mon-thu"], "")).toBe(
      "Bookings essential. Valid Monday to Thursday only."
    );
  });

  it("puts the merchant's own words last", () => {
    expect(renderTerms(["bookings"], "Maximum 6 people per booking.")).toBe(
      "Bookings essential. Maximum 6 people per booking."
    );
  });

  it("doesn't double up punctuation the merchant already typed", () => {
    expect(renderTerms([], "Ask at reception.")).toBe("Ask at reception.");
    expect(renderTerms([], "Ask at reception")).toBe("Ask at reception.");
  });

  it("is empty when nothing is ticked and nothing is typed", () => {
    expect(renderTerms([], "")).toBe("");
    expect(renderTerms([], "   ")).toBe("");
  });

  it("ignores an id that isn't a real condition", () => {
    expect(renderTerms(["bookings", "not-a-real-id"], "")).toBe("Bookings essential.");
  });
});

describe("parseTerms", () => {
  it("round-trips everything renderTerms produces", () => {
    // The property that matters: reopening a draft must hand back exactly
    // the state that produced its terms, for every combination.
    const cases: Array<[string[], string]> = [
      [[], ""],
      [["bookings"], ""],
      [["mention", "bookings", "mon-thu"], ""],
      [[], "Maximum 6 people per booking."],
      [["dine-in"], "Maximum 6 people per booking."],
      [STANDARD_TERMS.map((t) => t.id), "Anything else specific."],
    ];

    for (const [ids, custom] of cases) {
      const rendered = renderTerms(ids, custom);
      const parsed = parseTerms(rendered);
      expect(renderTerms(parsed.selectedIds, parsed.custom)).toBe(rendered);
    }
  });

  it("never reorders a merchant's own wording", () => {
    // The bug this guards: terms written with the custom sentence first
    // were split, hoisted into chips, and re-rendered with the standard
    // labels moved in front — so reopening and saving a draft silently
    // published a different sentence than the one that was reviewed.
    const written = "Ask at reception for the MegaDeal rate. Bookings essential.";
    const parsed = parseTerms(written);
    expect(renderTerms(parsed.selectedIds, parsed.custom)).toBe(written);
    expect(parsed.selectedIds).toEqual([]);
    expect(parsed.custom).toBe(written);
  });

  it("doesn't turn a merchant's sentence into a chip they can untick", () => {
    // Free text matching a label word for word used to become a ticked
    // chip. Unticking it then deleted their sentence outright.
    const written = "Bookings essential. Ask for Sam.";
    const parsed = parseTerms(written);
    expect(renderTerms(parsed.selectedIds, parsed.custom)).toBe(written);
  });

  it("recovers the chips from terms it did produce", () => {
    const rendered = renderTerms(["bookings", "mon-thu"], "");
    expect(parseTerms(rendered).selectedIds).toEqual(["bookings", "mon-thu"]);
    expect(parseTerms(rendered).custom).toBe("");
  });

  it("treats an empty string as nothing rather than a condition", () => {
    expect(parseTerms("")).toEqual({ selectedIds: [], custom: "" });
  });
});
