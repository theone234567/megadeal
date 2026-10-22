import { describe, expect, it } from "vitest";
import { dealMatchesSearch, foldText, searchWords } from "./dealSearch";

const brunch = {
  name: "Two brunches and two coffees for $45",
  description: "Choose any two dishes from our all-day brunch menu, plus two regular coffees.",
  categories: ["Food & Drink"],
  businessName: "Harbour Light Espresso",
  businessSuburb: "Ponsonby",
  businessCity: "Auckland",
};
const nails = {
  name: "Gel manicure for $35",
  description: "A long-lasting gel manicure in our Kingsland salon.",
  categories: ["Beauty & Spa"],
  businessName: "Kowhai Nails",
  businessSuburb: "Kingsland",
  businessCity: "Auckland",
};
const finds = (deal: typeof brunch, q: string) => dealMatchesSearch(deal, searchWords(q));

describe("deal search", () => {
  it("still finds what it found before", () => {
    for (const q of ["brunch", "Brunch", "coffee", "coffe", "ponsonby", "harbour light", "espresso", "food & drink"]) expect(finds(brunch, q)).toBe(true);
  });
  it("matches each word, wherever it is", () => {
    expect(finds(brunch, "brunch ponsonby")).toBe(true);
    expect(finds(brunch, "coffee in Ponsonby")).toBe(true);
    expect(finds(brunch, "espresso auckland deals")).toBe(true);
    expect(finds(brunch, "brunch takapuna")).toBe(false);
  });
  it("ignores accents and plurals", () => {
    expect(foldText("Café")).toBe("cafe");
    expect(finds({ ...brunch, description: "Our café's famous brunch" }, "cafe")).toBe(true);
    expect(finds(brunch, "café")).toBe(true); // a Food & Drink word
    expect(finds(nails, "manicures")).toBe(true);
  });
  it("finds a category by its everyday words, but not by specific ones", () => {
    expect(finds(brunch, "restaurant")).toBe(true);
    expect(finds(brunch, "cafes")).toBe(true);
    expect(finds(nails, "spa")).toBe(true);
    expect(finds(nails, "salon")).toBe(true);
    expect(finds(nails, "massage")).toBe(false);
    expect(finds(brunch, "gym")).toBe(false);
  });
  it("treats breakfast and brunch as the same, and a flat white as coffee", () => {
    expect(finds(brunch, "breakfast")).toBe(true);
    const flatWhite = { ...brunch, name: "Half-price flat white", description: "Made with our house blend.", businessName: "Kowhai Kitchen" };
    expect(finds(flatWhite, "coffee")).toBe(true);
    expect(finds(flatWhite, "coffees")).toBe(true);
  });
  it("a query of only filler words narrows nothing", () => {
    expect(searchWords("deals near the")).toEqual([]);
    expect(finds(nails, "deals")).toBe(true);
    expect(finds(nails, "zzzz")).toBe(false);
  });
});
