import { describe, expect, it } from "vitest";
import { availableMethods, cleanContactOverride, contactOverrideError, contactSummary, effectiveContact, leadingMethod, type ContactDetails } from "./contactOverride";

const business: ContactDetails = {
  phone: "09 123 4567",
  bookingUrl: "https://lakeside.co.nz/book",
  website: "https://lakeside.co.nz",
  email: null,
  preferred: "booking",
};

describe("contact details: entered once, overridden per deal", () => {
  it("a deal with no override uses the business's details", () => {
    expect(effectiveContact(business, null)).toEqual(business);
  });

  it("an override changes only what it names; the business is untouched", () => {
    const deal = effectiveContact(business, { phone: "021 555 1234", preferred: "phone" });
    expect(deal).toEqual({ ...business, phone: "021 555 1234", preferred: "phone" });
    expect(business.phone).toBe("09 123 4567");
  });

  it("a deliberate blank stays blank: the business's value doesn't come back", () => {
    const deal = effectiveContact(business, cleanContactOverride({ bookingUrl: "" }));
    expect(deal.bookingUrl).toBeNull();
    expect(availableMethods(deal)).toEqual(["phone", "website"]);
  });

  it("the chosen button falls back when its method has gone", () => {
    const deal = effectiveContact(business, { bookingUrl: null });
    expect(leadingMethod(deal)).toBe("phone");
    expect(contactSummary(deal)).toBe("Call · Website");
    expect(contactSummary(business)).toBe("Book online · Call · Website");
  });

  it("rejects unsafe links, bad emails and phone numbers, and unknown keys", () => {
    expect(contactOverrideError({ website: "javascript:alert(1)" })).toMatch(/web address/);
    expect(contactOverrideError({ bookingUrl: "data:text/html,x" })).toMatch(/web address/);
    expect(contactOverrideError({ email: "nope" })).toMatch(/email/);
    expect(contactOverrideError({ phone: "12" })).toMatch(/phone/);
    expect(contactOverrideError({ owner: "x" })).not.toBeNull();
    expect(contactOverrideError({ preferred: "fax" })).not.toBeNull();
    expect(contactOverrideError({ phone: "021 555 1234", website: "lakeside.co.nz" })).toBeNull();
  });

  it("stores tidy values", () => {
    expect(cleanContactOverride({ website: " lakeside.co.nz ", email: " a@b.co " })).toEqual({ website: "https://lakeside.co.nz/", email: "a@b.co" });
    expect(cleanContactOverride({})).toBeNull();
    expect(cleanContactOverride("x")).toBeNull();
  });
});
