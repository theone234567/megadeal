import { describe, it, expect } from "vitest";
import { sanitizeDraft, draftToRow, parseDraft, EMPTY_DRAFT, MAX_DRAFT_TEXT } from "./dealDraft";
import { renderTerms } from "./dealTerms";

const FULL = {
  ...EMPTY_DRAFT,
  dealName: "Two-Course Dinner for Two",
  category: "Food & Drink",
  description: "Share an entrée and a main each.",
  selectedTerms: ["bookings", "mon-thu"],
  customTerms: "Maximum 6 people per booking.",
  terms: renderTerms(["bookings", "mon-thu"], "Maximum 6 people per booking."),
  priceNow: "59",
  priceWas: "118",
  quantityAvailable: "40",
  durationDays: 30,
  durationMinutes: 60,
  isFlash: false,
  photoUrl: "https://static.wixstatic.com/media/abc.jpg",
  photoMediaId: "media-1",
};

describe("sanitizeDraft", () => {
  it("keeps a draft that is still half-written", () => {
    // A draft is unfinished by definition. Refusing one for a blank price
    // would defeat the point of having drafts at all.
    const draft = sanitizeDraft({ dealName: "Just a name so far" });
    expect(draft.dealName).toBe("Just a name so far");
    expect(draft.priceNow).toBe("");
  });

  it("ignores junk types instead of trusting them", () => {
    const draft = sanitizeDraft({
      dealName: 42,
      selectedTerms: "not-an-array",
      isFlash: "yes",
      durationDays: -5,
    });
    expect(draft.dealName).toBe("");
    expect(draft.selectedTerms).toEqual([]);
    expect(draft.isFlash).toBe(true);
    // A negative duration falls back rather than producing a deal that
    // expires before it starts.
    expect(draft.durationDays).toBe(30);
  });

  it("caps long text at the same point the form stops accepting it", () => {
    const draft = sanitizeDraft({ description: "x".repeat(MAX_DRAFT_TEXT + 500) });
    expect(draft.description.length).toBe(MAX_DRAFT_TEXT);
  });

  it("drops non-string entries from the ticked conditions", () => {
    const draft = sanitizeDraft({ selectedTerms: ["bookings", 7, null, "mon-thu"] });
    expect(draft.selectedTerms).toEqual(["bookings", "mon-thu"]);
  });
});

describe("draftToRow / parseDraft", () => {
  it("round-trips a full draft through the row", () => {
    const row = draftToRow(FULL, "merchant@example.co.nz");
    expect(parseDraft(row)).toEqual(FULL);
  });

  it("marks the row as a draft with no product behind it", () => {
    // This is what keeps a draft off the storefront: every public read
    // joins by productId, so a row without one cannot be found.
    const row = draftToRow(FULL, "merchant@example.co.nz") as any;
    expect(row.status).toBe("Draft");
    expect(row.productId).toBeUndefined();
  });

  it("survives draftData being dropped entirely", () => {
    // The case this exists for: draftData is a new Wix field that may not
    // persist. Everything must come back from real columns plus the
    // statusNote supplement.
    const row = draftToRow(FULL, "merchant@example.co.nz") as any;
    const { draftData, ...withoutDraftData } = row;
    const parsed = parseDraft(withoutDraftData);

    expect(parsed.dealName).toBe(FULL.dealName);
    expect(parsed.description).toBe(FULL.description);
    expect(parsed.category).toBe(FULL.category);
    expect(parsed.priceNow).toBe("59");
    expect(parsed.priceWas).toBe("118");
    expect(parsed.quantityAvailable).toBe("40");
    expect(parsed.durationDays).toBe(30);
    expect(parsed.photoUrl).toBe(FULL.photoUrl);
    expect(parsed.photoMediaId).toBe(FULL.photoMediaId);
    // The ticked conditions come back out of the rendered sentence.
    expect(parsed.selectedTerms).toEqual(FULL.selectedTerms);
    expect(parsed.customTerms).toBe(FULL.customTerms);
  });

  it("survives draftData being unparseable", () => {
    const row = draftToRow(FULL, "merchant@example.co.nz") as any;
    const parsed = parseDraft({ ...row, draftData: "{not json" });
    expect(parsed.dealName).toBe(FULL.dealName);
    expect(parsed.category).toBe(FULL.category);
  });

  it("keeps a blank price blank rather than inventing a zero", () => {
    const sparse = { ...EMPTY_DRAFT, dealName: "No price yet" };
    const row = draftToRow(sparse, "merchant@example.co.nz");
    expect(parseDraft(row).priceNow).toBe("");
  });

  it("ignores a statusNote that isn't one of ours", () => {
    // statusNote is also the admin's rejection-note field. A human note
    // must never be parsed as draft state.
    const row = draftToRow(FULL, "merchant@example.co.nz") as any;
    const parsed = parseDraft({
      ...row,
      draftData: "",
      statusNote: "Please use a clearer photo.",
    });
    expect(parsed.category).toBe("");
  });

  it("reads nothing out of an empty row without throwing", () => {
    expect(() => parseDraft({})).not.toThrow();
    expect(parseDraft({}).dealName).toBe("");
  });
});
