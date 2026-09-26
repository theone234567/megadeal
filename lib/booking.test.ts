import { describe, it, expect } from "vitest";
import {
  bookingPlan,
  bookingConflict,
  effectiveBookingRequirement,
  emailLink,
  hasUsableBookingRoute,
  parseBookingRequirement,
  phoneLink,
} from "./booking";
import { renderTerms } from "./dealTerms";
import { safeWebHref } from "./socialLinks";

const none = { bookingUrl: null, phone: null, bookingEmail: null };
const kinds = (actions: { kind: string }[]) => actions.map((a) => a.kind);

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
      href: "tel:091234567",
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

describe("bookingPlan — which actions follow the revealed code", () => {
  it("required + booking URL + phone: Book online, then Call to book", () => {
    const plan = bookingPlan(
      "required",
      {
        bookingUrl: "spa.co.nz/book",
        phone: "09 123 4567",
        bookingEmail: null,
      },
      "The Spa",
      "Massage",
    );
    expect(kinds(plan.actions)).toEqual(["book_online", "call"]);
    expect(plan.actions[0]).toMatchObject({
      label: "Book online",
      href: "https://spa.co.nz/book",
      external: true,
    });
    expect(plan.actions[1].label).toBe("Call to book");
    expect(plan.conditionsHeading).toBe("Before you book");
    expect(plan.reservationNote).toMatch(/doesn’t reserve/);
  });

  it("required + phone only: Call to book with the number visible", () => {
    const plan = bookingPlan("required", { ...none, phone: "09 123 4567" }, "Pizzeria", "Pizza");
    expect(kinds(plan.actions)).toEqual(["call"]);
    expect(plan.nextStepHeading).toBe("Your next step: call to book");
    expect(plan.phone?.display).toBe("09 123 4567");
  });

  it("required + email only: Email to book with an encoded mailto", () => {
    const plan = bookingPlan("required", { ...none, bookingEmail: "hi@bar.nz" }, "Bar", "Tapas & wine");
    expect(kinds(plan.actions)).toEqual(["email"]);
    expect(plan.actions[0].href).toBe("mailto:hi@bar.nz?subject=MegaDeal%3A%20Tapas%20%26%20wine");
  });

  it("no booking needed + a business booking URL: no booking step on the deal", () => {
    const plan = bookingPlan(
      "not_required",
      { bookingUrl: "cafe.nz/book", phone: "09 123 4567", bookingEmail: null },
      "Cafe",
      "Coffee",
    );
    expect(plan.actions).toEqual([]);
    expect(plan.nextStepHeading).toBe("No booking needed");
    expect(plan.instruction).toMatch(/Show your code/);
    expect(plan.conditionsHeading).toBe("Before you go");
    expect(plan.reservationNote).toBeNull();
    // General contacts stay available in About, under neutral labels.
    expect(plan.aboutActions.map((a) => a.label)).toEqual(["Online booking", "Call the business"]);
  });

  it("recommended: advises booking without calling it mandatory", () => {
    const plan = bookingPlan("recommended", { ...none, phone: "09 123 4567" }, "Salon", "Cut");
    expect(plan.nextStepHeading).toBe("Booking recommended");
    expect(plan.instruction).toMatch(/advised/);
  });

  it("unknown legacy deal: neutral contact routes, no booking or walk-in promise", () => {
    const plan = bookingPlan(
      "unknown",
      { bookingUrl: "x.nz/book", phone: "09 123 4567", bookingEmail: "a@b.nz" },
      "Biz",
      "Deal",
    );
    expect(plan.actions.map((a) => a.label)).toEqual(["Call the business", "Email the business"]);
    expect(plan.nextStepHeading).toBe("Contact the business");
    expect(plan.conditionsHeading).toBe("Before you go");
  });

  it("missing contacts: no empty or placeholder buttons", () => {
    const plan = bookingPlan(
      "required",
      { bookingUrl: "javascript:alert(1)", phone: "12", bookingEmail: "nope" },
      "Biz",
      "Deal",
    );
    expect(plan.actions).toEqual([]);
    expect(plan.nextStepHeading).toBe("Your next step: contact the business");
    expect(
      hasUsableBookingRoute({
        bookingUrl: "javascript:alert(1)",
        phone: "12",
        bookingEmail: "nope",
      }),
    ).toBe(false);
    expect(hasUsableBookingRoute({ ...none, phone: "09 123 4567" })).toBe(true);
  });

  it("without a code, asks customers to mention MegaDeal instead", () => {
    const plan = bookingPlan("required", { ...none, phone: "09 123 4567" }, "Pizzeria", "Pizza", false);
    expect(plan.instruction).toBe("Mention this MegaDeal offer when you call Pizzeria.");
    expect(plan.howToStep).toBe("Call Pizzeria and mention MegaDeal");
  });
});
