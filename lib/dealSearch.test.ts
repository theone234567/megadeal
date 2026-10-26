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

describe("deal search covers everything a customer can read (Flash and Everyday)", () => {
  const flash = {
    name: "Half-price flat white this afternoon",
    description: "Pop in after 2pm for a half-price flat white. " + "Our beans are roasted in Auckland every week. ".repeat(10) + "Oat milk at no extra cost.",
    categories: ["Food & Drink"],
    isFlash: true,
    terms: "Dine-in only. One per customer.",
    tags: ["date-night"],
    customerInstructions: "Show the code at the counter.",
    bookingRequirement: "not_required" as const,
    now: 3,
    businessName: "Puriri Bakery",
    businessSuburb: "Grey Lynn",
    businessCity: "Auckland",
    businessBio: "A family bakery known for sourdough and pies.",
    businessAmenities: ["Wheelchair access"],
  };
  const everyday = { ...brunch, isFlash: false };
  const q = (deal: object, text: string) => dealMatchesSearch(deal as typeof brunch, searchWords(text));

  it("'flash' finds Flash deals and 'everyday' finds Everyday ones", () => {
    expect(q(flash, "flash")).toBe(true);
    expect(q(flash, "flash deals")).toBe(true);
    expect(q(flash, "flash coffee")).toBe(true);
    expect(q(everyday, "flash")).toBe(false);
    expect(q(everyday, "everyday brunch")).toBe(true);
  });

  it("the whole description, conditions, tags, note, booking, price and the business", () => {
    for (const t of ["oat milk", "dine-in", "one per customer", "date night", "counter", "walk-in", "half-price", "$3", "sourdough", "wheelchair", "grey lynn"]) {
      expect(q(flash, t), t).toBe(true);
    }
    expect(q(flash, "takeaway pizza")).toBe(false);
  });

  it("a card carries the same search text, built from the full deal", async () => {
    const { toCardDeal } = await import("./listingDeal");
    const { dealSearchText } = await import("./dealSearch");
    const card = toCardDeal({ ...flash, id: "1", slug: "x" } as never);
    expect(card.description.length).toBeLessThanOrEqual(300);
    expect(card.searchText).toBe(dealSearchText(flash));
    expect(q(card, "oat milk")).toBe(true);
    expect(q(card, "sourdough")).toBe(true);
    // Never the deal code.
    const coded = toCardDeal({ ...flash, id: "1", slug: "x", dealCode: "SECRET42" } as never);
    expect(coded.searchText).not.toContain("secret42");
  });
});

describe("deal search, T252", () => {
  const coffee = { name: "Two flat whites", description: "<p>Two coffees at the counter.</p>", categories: ["Food & Drink"] };
  const spa = { name: "60 minute massage", description: "<p>Relax.</p>", categories: ["Beauty & Spa"] };
  const q = (deal: typeof coffee, query: string) => dealMatchesSearch(deal, searchWords(query));

  it("ignores 'near me' and friends", () => {
    expect(q(coffee, "coffee near me")).toBe(true);
    expect(q(coffee, "best coffee nearby")).toBe(true);
    expect(q(spa, "coffee near me")).toBe(false);
  });

  it("reads known emoji as words, and matches nothing for other symbols", () => {
    expect(q(coffee, "☕")).toBe(true);
    expect(q(spa, "💆")).toBe(true);
    expect(q(spa, "☕")).toBe(false);
    expect(q(coffee, "🦄")).toBe(false);
    expect(q(coffee, "!!!")).toBe(false);
    expect(searchWords("near me")).toEqual([]);
  });

  it("forgives one slipped letter in a longer word", () => {
    expect(q(coffee, "cofee")).toBe(true);
    expect(q(spa, "masage")).toBe(true);
    expect(q(spa, "mssage")).toBe(true);
    expect(q(coffee, "masage")).toBe(false);
    expect(q(coffee, "cofe")).toBe(false); // too short to guess
  });
});
