import { describe, expect, it } from "vitest";
import { splitDescription } from "./dealDescription";

describe("splitDescription", () => {
  it("puts prose in paragraphs and a written list in What's included", () => {
    const text = `Two nights in a lake-view room.
Wake up to the water.

What's included:
- Two nights in a lake-view room for two adults
• Breakfast each morning
* Late checkout, subject to availability
1. Deck access and parking`;
    expect(splitDescription(text)).toEqual({
      paragraphs: ["Two nights in a lake-view room. Wake up to the water."],
      included: [
        "Two nights in a lake-view room for two adults",
        "Breakfast each morning",
        "Late checkout, subject to availability",
        "Deck access and parking",
      ],
    });
  });

  it("invents nothing when there's no list", () => {
    expect(splitDescription("A wood-fired pizza for two.\n\nPlus a burrata salad.")).toEqual({
      paragraphs: ["A wood-fired pizza for two.", "Plus a burrata salad."],
      included: [],
    });
    expect(splitDescription(null)).toEqual({ paragraphs: [], included: [] });
  });

  it("leaves hyphenated words and prices alone", () => {
    expect(splitDescription("Self-guided tour -50% off").included).toEqual([]);
  });
});
