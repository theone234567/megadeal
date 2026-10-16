import { describe, it, expect } from "vitest";
import { comparableUrl, resolveDealContact, type DealContactInput } from "./dealContact";

const base: DealContactInput = {
  requirement: "required",
  businessName: "Lakeside Retreat",
  dealName: "Two nights for two",
  code: "LAKEAB",
  phone: null,
  email: null,
  website: null,
  bookingUrl: null,
  codeWebsiteUrl: null,
  directionsUrl: null,
  addressText: null,
};
const methods = (c: ReturnType<typeof resolveDealContact>) => [c.primary, c.secondary, ...c.links].filter(Boolean).map((a) => a!.method);

describe("resolveDealContact", () => {
  it("booking link + website only: just those two, Book online first", () => {
    const c = resolveDealContact({ ...base, bookingUrl: "lakeside.co.nz/book", website: "lakeside.co.nz" });
    expect(c.primary).toMatchObject({ method: "booking", label: "Book online", href: "https://lakeside.co.nz/book" });
    expect(methods(c)).toEqual(["booking", "website"]);
  });

  it("phone only: Call business is the main button and the copy says to call", () => {
    const c = resolveDealContact({ ...base, phone: "09 123 4567" });
    expect(c.primary).toMatchObject({ method: "phone", href: "tel:091234567", detail: "09 123 4567" });
    expect(c.instruction).toBe("Call to check availability and quote LAKEAB.");
    expect(methods(c)).toEqual(["phone"]);
  });

  it("email only: a draft with the deal and code, never sent", () => {
    const c = resolveDealContact({ ...base, email: "stay@lakeside.co.nz" });
    expect(c.primary?.href.startsWith("mailto:stay@lakeside.co.nz?subject=")).toBe(true);
    expect(decodeURIComponent(c.primary!.href)).toContain("Deal code: LAKEAB");
  });

  it("the same page as website and booking link is one button; a different query is a different page", () => {
    const same = resolveDealContact({ ...base, bookingUrl: "https://www.lakeside.co.nz/", website: "lakeside.co.nz" });
    expect(methods(same)).toEqual(["booking"]);
    const different = resolveDealContact({ ...base, bookingUrl: "lakeside.co.nz/?book=1", website: "lakeside.co.nz" });
    expect(methods(different)).toEqual(["booking", "website"]);
    expect(comparableUrl("https://www.A.co.nz/x/?q=1")).toBe("a.co.nz/x?q=1");
  });

  it("walk-in: no main button, no booking link, show-before-paying copy", () => {
    const c = resolveDealContact({
      ...base,
      requirement: "not_required",
      bookingUrl: "lakeside.co.nz/book",
      phone: "09 123 4567",
      directionsUrl: "https://maps.example/x",
    });
    expect(c.primary).toBeNull();
    expect(c.secondary?.method).toBe("directions");
    expect(methods(c)).not.toContain("booking");
    expect(c.instruction).toBe("Show this code before ordering or paying. No booking needed.");
    expect(c.footer).toBe("Pay the business directly.");
  });

  it("recommended and required: honest copy, no reservation implied", () => {
    const rec = resolveDealContact({ ...base, requirement: "recommended", phone: "09 123 4567" });
    expect(rec.instruction).toBe("Contact the business to check availability, or show this code when you visit.");
    expect(rec.footer).toMatch(/not a confirmed booking/);
    const req = resolveDealContact({ ...base, bookingUrl: "lakeside.co.nz/book" });
    expect(req.requirementLine).toBe("Booking required.");
    expect(req.footer).toBe("Pay the business directly. Your booking is only confirmed by the business.");
    for (const c of [rec, req]) expect(`${c.instruction} ${c.footer}`).not.toMatch(/reserved|guaranteed|confirmed booking is/i);
  });

  it("the business's own online code: enter it when booking online", () => {
    const c = resolveDealContact({ ...base, code: "SUMMER25", codeWebsiteUrl: "lakeside.co.nz/checkout", bookingUrl: "other.co.nz" });
    expect(c.primary).toMatchObject({ method: "booking", href: "https://lakeside.co.nz/checkout" });
    expect(c.instruction).toBe("Enter this code when you book on the business's website.");
  });

  it("walk-in with the business's own online code: the checkout is the outlined button, never 'Book online'", () => {
    const c = resolveDealContact({ ...base, requirement: "not_required", code: "SPRING-15", codeWebsiteUrl: "shop.co.nz/spring", directionsUrl: "https://maps.example/x" });
    expect(c.primary).toBeNull();
    expect(c.secondary).toMatchObject({ method: "booking", label: "Use code online" });
    expect(c.links.map((a) => a.method)).toEqual(["directions"]);
  });

  it("uses the preferred method when it's there, and falls back (flagged) when it isn't", () => {
    const both = { ...base, phone: "09 123 4567", bookingUrl: "lakeside.co.nz/book" };
    expect(resolveDealContact({ ...both, preferred: "phone" }).primary?.method).toBe("phone");
    expect(resolveDealContact({ ...both, preferred: "phone" }).secondary?.method).toBe("booking");
    const gone = resolveDealContact({ ...both, preferred: "email" });
    expect(gone.primary?.method).toBe("booking");
    expect(gone.preferredUnavailable).toBe(true);
  });

  it("never offers an unusable method", () => {
    const c = resolveDealContact({ ...base, phone: "123", email: "nope", website: "javascript:alert(1)", bookingUrl: "data:text/html,x" });
    expect(c.primary).toBeNull();
    expect(methods(c)).toEqual([]);
  });

  it("no code: never says 'this code'", () => {
    for (const requirement of ["required", "recommended", "not_required", "unknown"] as const) {
      const c = resolveDealContact({ ...base, code: null, requirement, phone: "09 123 4567" });
      expect(c.instruction).not.toMatch(/this code|quote null/);
    }
  });
});
