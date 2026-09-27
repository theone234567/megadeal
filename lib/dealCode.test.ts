import { describe, it, expect } from "vitest";
import { dealCodeError, generateDealCode, normaliseDealCode } from "./dealCode";
import { parseAdminContentEdit } from "./dealAdminEdit";
import { draftToRow, parseDraft, sanitizeDraft } from "./dealDraft";

const check = (raw: string) => dealCodeError(normaliseDealCode(raw));

describe("business-chosen deal codes", () => {
  it("tidies case and spaces", () => {
    expect(normaliseDealCode("  summer 20 ")).toBe("SUMMER-20");
    expect(normaliseDealCode("pizza   night")).toBe("PIZZA-NIGHT");
    expect(check("summer 20")).toBeNull();
    expect(check("PIZZA4TWO")).toBeNull();
  });

  it("turns look-alike full-width letters into plain ones before checking", () => {
    expect(normaliseDealCode("ＳＵＭＭＥＲ")).toBe("SUMMER");
  });

  it("rejects anything but letters, numbers and single hyphens", () => {
    for (const bad of ["<script>", "SUM\"MER", "A--B20", "-SUMMER", "SUMMER-", "PIZZA!", "CAFÉ-20", "TACO🌮", "a_b_c_d", "https://x.co"]) {
      expect(check(bad), bad).not.toBeNull();
    }
  });

  it("says exactly what's wrong", () => {
    expect(check("ABC")).toBe("Too short — your code has 3 characters; it needs at least 4.");
    expect(check("A".repeat(23))).toBe("Too long — your code has 23 characters; the maximum is 20.");
    expect(check("12345")).toMatch(/at least one letter/);
    expect(check("PIZZA!@")).toBe("These characters can't be used: !  @. Use only letters A–Z, numbers 0–9 and hyphens.");
    expect(check("CAFÉ-20")).toMatch(/can't be used: É/);
    expect(check("-SUMMER")).toMatch(/start or end/);
    expect(check("A--B20")).toMatch(/single hyphens/);
  });

  it("reserves MegaDeal's own prefix for businesses, not admins", () => {
    expect(check("MEGA-12ABC")).toMatch(/reserved/);
    expect(check("mega")).toMatch(/reserved/);
    expect(check("MEGADEAL20")).toBeNull(); // only the MEGA- prefix is reserved
    expect(dealCodeError("MEGA-12ABC", { allowReserved: true })).toBeNull();
  });

  it("generated codes still look like MEGA-XXXXX", () => {
    expect(generateDealCode()).toMatch(/^MEGA-[2-9A-HJKMNP-Z]{5}$/);
  });
});

describe("admin editing a deal code", () => {
  const row = { dealName: "x", priceNow: 10, priceWas: 10, terms: "t", dealCode: "MEGA-ABCDE" };
  it("accepts a valid code and records the change", () => {
    expect(parseAdminContentEdit({ dealCode: "tuesday deal" }, row)).toEqual({ changes: { dealCode: "TUESDAY-DEAL" }, error: null });
  });
  it("refuses an empty or invalid code", () => {
    expect(parseAdminContentEdit({ dealCode: "" }, row).error).toMatch(/can't be empty/);
    expect(parseAdminContentEdit({ dealCode: "<b>" }, row).error).not.toBeNull();
  });
});

describe("drafts keep the chosen code", () => {
  it("round-trips through a saved draft", () => {
    const draft = sanitizeDraft({ dealName: "Pizza", dealCode: "pizza night" });
    expect(draft.dealCode).toBe("PIZZA-NIGHT");
    const row = draftToRow(draft, "a@b.nz");
    expect(parseDraft(row).dealCode).toBe("PIZZA-NIGHT");
    // …even if draftData is lost and only the supplement survives
    expect(parseDraft({ ...row, draftData: "" }).dealCode).toBe("PIZZA-NIGHT");
  });
});
