import { describe, it, expect } from "vitest";
import {
  bookingConflict,
  contactInstruction,
  contactOptions,
  effectiveBookingRequirement,
  emailLink,
  hasUsableBookingRoute,
  parseBookingRequirement,
  phoneLink,
} from "./booking";
import { renderTerms } from "./dealTerms";
import { safeWebHref } from "./socialLinks";

const none = { bookingUrl: null, phone: null, bookingEmail: null };

describe("parseBookingRequirement / effectiveBookingRequirement", () => {
  it("reads the three stored choices and treats anything else as unknown", () => {
    expect(parseBookingRequirement("required")).toBe("required");
    expect(parseBookingRequirement("not_required")).toBe("not_required");
    expect(parseBookingRequirement(undefined)).toBe("unknown");
    expect(parseBookingRequirement("yes")).toBe("unknown");
  });

  it("never infers 'no booking needed' for a legacy deal", () => {
    expect(effectiveBookingRequirement("unknown", "")).toBe("unknown");
    expect(effectiveBookingRequirement("unknown", renderTerms(["dine-in"], ""))).toBe("unknown");
  });

  it("treats a legacy 'Bookings essential' deal as booking required", () => {
    expect(effectiveBookingRequirement("unknown", renderTerms(["bookings", "mon-thu"], ""))).toBe("required");
  });

  it("lets an explicit choice win over the terms", () => {
    expect(effectiveBookingRequirement("recommended", renderTerms(["bookings"], ""))).toBe("recommended");
  });
});

describe("bookingConflict", () => {
  it("catches 'No booking needed' alongside the ticked 'Bookings essential'", () => {
    expect(bookingConflict("not_required", renderTerms(["bookings"], ""))).toMatch(/Change one of them/);
  });
  it("is fine otherwise", () => {
    expect(bookingConflict("required", renderTerms(["bookings"], ""))).toBeNull();
    expect(bookingConflict("not_required", renderTerms(["dine-in"], ""))).toBeNull();
  });
});

describe("contact helpers", () => {
  it("builds a tel link and keeps the readable number", () => {
    expect(phoneLink("09 123 4567")).toEqual({
      display: "09 123 4567",
      href: "tel:+6491234567",
    });
    expect(phoneLink("+64 21 555 1234")?.href).toBe("tel:+64215551234");
    expect(phoneLink("123")).toBeNull();
    expect(phoneLink("")).toBeNull();
  });

  it("encodes the mailto subject and rejects non-emails", () => {
    expect(emailLink("book@cafe.co.nz", "MegaDeal: Brunch & coffee")).toBe(
      "mailto:book@cafe.co.nz?subject=MegaDeal%3A%20Brunch%20%26%20coffee",
    );
    expect(emailLink("not-an-email", "x")).toBeNull();
  });

  it("only allows web links", () => {
    expect(safeWebHref("cafe.co.nz/book")).toBe("https://cafe.co.nz/book");
    expect(safeWebHref("javascript:alert(1)")).toBeNull();
    expect(safeWebHref("data:text/html,hi")).toBeNull();
    expect(safeWebHref("")).toBeNull();
  });
});

describe("hasUsableBookingRoute — a booking-required deal needs a way to book", () => {
  it("needs a booking link, a callable phone or a valid email", () => {
    expect(hasUsableBookingRoute(none)).toBe(false);
    expect(hasUsableBookingRoute({ ...none, phone: "123" })).toBe(false);
    expect(hasUsableBookingRoute({ ...none, phone: "09 123 4567" })).toBe(true);
    expect(hasUsableBookingRoute({ ...none, bookingEmail: "book@spa.co.nz" })).toBe(true);
    expect(hasUsableBookingRoute({ ...none, bookingUrl: "spa.co.nz/book" })).toBe(true);
    expect(hasUsableBookingRoute({ ...none, bookingUrl: "javascript:alert(1)" })).toBe(false);
  });
});

describe("contactOptions — what the Contact business pop-up lists", () => {
  const base = {
    requirement: "recommended" as const,
    businessName: "Test Pizzeria",
    dealName: "Pizza for two",
    dealCode: "MEGA-ABCDE",
    phone: null,
    email: null,
    website: null,
    bookingUrl: null,
    codeWebsiteUrl: null,
    directionsUrl: null,
    addressText: null,
  };
  const kinds = (o: { kind: string }[]) => o.map((x) => x.kind);

  it("lists only what exists, always in the same order", () => {
    expect(contactOptions(base)).toEqual([]);
    expect(kinds(contactOptions({ ...base, website: "pizza.co.nz", phone: "09 123 4567" }))).toEqual(["phone", "website"]);
    expect(
      kinds(
        contactOptions({
          ...base,
          phone: "09 123 4567",
          email: "hi@pizza.co.nz",
          website: "https://pizza.co.nz",
          directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=1%20Main%20St",
          addressText: "1 Main St, Ponsonby",
        }),
      ),
    ).toEqual(["phone", "email", "website", "directions"]);
  });

  it("drops unusable details rather than showing a broken row", () => {
    expect(contactOptions({ ...base, phone: "123", email: "not an email", website: "javascript:alert(1)" })).toEqual([]);
  });

  it("prefills an enquiry email with the deal and its code", () => {
    const [mail] = contactOptions({ ...base, email: "hi@pizza.co.nz" });
    expect(mail).toMatchObject({ kind: "email", detail: "hi@pizza.co.nz", external: false });
    const url = new URL(mail.href);
    expect(url.protocol).toBe("mailto:");
    expect(url.searchParams.get("subject")).toBe("MegaDeal enquiry — Pizza for two");
    expect(url.searchParams.get("body")).toBe(
      "Hi Test Pizzeria,\n\nI'm interested in your MegaDeal offer:\nPizza for two\n\nDeal code: MEGA-ABCDE\n\nThanks.",
    );
  });

  it("website: the deal's code link, else the booking link for a booked offer, else the website", () => {
    const withAll = { ...base, website: "pizza.co.nz", bookingUrl: "book.pizza.co.nz", codeWebsiteUrl: "https://pizza.co.nz/shop" };
    expect(contactOptions(withAll)[0]).toMatchObject({ label: "Website", href: "https://pizza.co.nz/shop", note: "Enter your code at checkout" });
    expect(contactOptions({ ...withAll, codeWebsiteUrl: null })[0]).toMatchObject({
      label: "Booking website",
      href: "https://book.pizza.co.nz/",
      detail: "book.pizza.co.nz",
    });
    // A no-booking offer never sends people to a booking page.
    expect(contactOptions({ ...withAll, codeWebsiteUrl: null, requirement: "not_required" })[0]).toMatchObject({
      label: "Website",
      href: "https://pizza.co.nz/",
    });
    expect(contactOptions({ ...base, bookingUrl: "book.pizza.co.nz", requirement: "not_required" })).toEqual([]);
  });

  it("directions only when the caller has a public place for it", () => {
    expect(contactOptions({ ...base, addressText: "1 Main St" })).toEqual([]);
    expect(contactOptions({ ...base, directionsUrl: "https://maps.example/x" })[0]).toMatchObject({ detail: "Open in maps", external: true });
  });
});

describe("contactInstruction — the line under Contact business", () => {
  it("follows the booking requirement", () => {
    expect(contactInstruction("required", "MEGA-ABCDE")).toEqual({
      heading: "Booking required",
      text: "Quote your deal code when contacting the business.",
    });
    expect(contactInstruction("recommended", "MEGA-ABCDE").heading).toBe("Booking recommended");
    expect(contactInstruction("not_required", "MEGA-ABCDE")).toEqual({
      heading: "No booking required",
      text: "Show or quote your deal code when you visit.",
    });
    expect(contactInstruction("unknown", "MEGA-ABCDE").text).toMatch(/Check the conditions/);
  });

  it("never mentions a code a deal doesn't have", () => {
    for (const r of ["required", "recommended", "not_required", "unknown"] as const) {
      expect(contactInstruction(r, null).text).not.toMatch(/code/);
    }
  });

  it("walk-ins only on a recommended booking the business said takes them", () => {
    expect(contactInstruction("recommended", "X1", { walkIns: true }).text).toMatch(/Walk-ins welcome/);
    expect(contactInstruction("required", "X1", { walkIns: true }).text).not.toMatch(/Walk-ins/);
  });

  it("says to enter the code online only when the business confirmed it works there", () => {
    expect(contactInstruction("required", "SUMMER-20", { websiteCode: true }).text).toMatch(/at checkout/);
    expect(contactInstruction("required", "SUMMER-20").text).not.toMatch(/checkout/);
  });
});
