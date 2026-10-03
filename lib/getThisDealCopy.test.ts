import { describe, expect, it } from "vitest";
import { getThisDealCopy, isMegaDealCode } from "./booking";

describe("getThisDealCopy", () => {
  it("no booking needed: show the code, no availability note", () => {
    expect(getThisDealCopy("not_required", null, "MEGA-ABCDE")).toEqual({
      heading: "No booking needed",
      instruction: "Show this code before ordering or paying.",
      availability: null,
    });
  });

  it("booking required or recommended: quote the code, never a confirmed booking", () => {
    const req = getThisDealCopy("required", "call", "MEGA-ABCDE");
    expect(req.heading).toBe("Booking required");
    expect(req.instruction).toBe("Book with the business and quote your code.");
    expect(req.availability).toBe("Subject to availability. Your code does not confirm a booking.");
    const rec = getThisDealCopy("recommended", "call", "MEGA-ABCDE");
    expect(rec.heading).toBe("Booking recommended");
    expect(rec.instruction).toBe("We recommend booking ahead. Quote your code when contacting the business.");
  });

  it("online: the business's own code goes in at checkout; a MEGA- code is shown on arrival", () => {
    expect(getThisDealCopy("required", "book_online", "PIZZA-NIGHT").instruction).toMatch(/enter this code at checkout/);
    const mega = getThisDealCopy("recommended", "book_online", "MEGA-ABCDE").instruction;
    expect(mega).toMatch(/show this code when you visit/);
    expect(mega).not.toMatch(/checkout/);
  });

  it("email: an enquiry the business confirms", () => {
    expect(getThisDealCopy("required", "email", "MEGA-ABCDE").instruction).toBe(
      "Include this code in your booking enquiry. Wait for the business to confirm.",
    );
  });

  it("a deal without a code says to mention MegaDeal, never 'your code'", () => {
    for (const r of ["required", "recommended", "not_required", "unknown"] as const) {
      expect(getThisDealCopy(r, "call", null).instruction).not.toMatch(/your code|this code/);
    }
  });

  it("knows MegaDeal's own codes", () => {
    expect(isMegaDealCode("MEGA-7K4XQ")).toBe(true);
    expect(isMegaDealCode("SUMMER-20")).toBe(false);
    expect(isMegaDealCode(null)).toBe(false);
  });
});
