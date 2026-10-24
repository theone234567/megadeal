import { describe, expect, it } from "vitest";
import { contactInText, linkProblems, ownDomains, plausibleNzPhone, registrableDomain } from "./linkSafety";

/** Links on a deal that auto-posts (T207). */
const own = ownDomains({ website: "https://www.harbourbistro.co.nz", bookingUrl: "https://www.bookme.co.nz/x", email: "owner@gmail.com", bookingEmail: "book@harbourbistro.co.nz" });
const url = (field: string, value: string) => ({ field, value, kind: "url" as const });

describe("link safety", () => {
  it("knows the business's own domain, not a booking platform's or a free mail service's", () => {
    expect(own).toEqual(["harbourbistro.co.nz"]);
    expect(registrableDomain("shop.harbourbistro.co.nz")).toBe("harbourbistro.co.nz");
    expect(registrableDomain("www.example.com")).toBe("example.com");
  });

  it("lets the business's own site and known booking platforms through", () => {
    expect(linkProblems([url("booking link", "https://www.fresha.com/a/harbour"), url("website link", "harbourbistro.co.nz/menu"), url("redeem link", "https://shop.harbourbistro.co.nz/cart")], own)).toEqual([]);
    expect(linkProblems([{ field: "email", value: "bookings@gmail.com", kind: "email" }], own)).toEqual([]);
  });

  it("holds lookalikes, shorteners, raw IPs, punycode and anything unknown", () => {
    expect(
      linkProblems(
        [
          url("booking link", "https://harbourbistr0.co.nz/login"),
          url("redeem link", "https://bit.ly/x"),
          url("website link", "http://203.0.113.9/pay"),
          url("booking link", "https://xn--hrbourbistro-1db.co.nz"),
          url("website link", "javascript:alert(1)"),
          { field: "email", value: "pay@harbour-bistro-payments.com", kind: "email" },
        ],
        own,
      ),
    ).toEqual([
      "booking link domain not recognised (harbourbistr0.co.nz)",
      "redeem link is a link shortener (bit.ly)",
      "website link is a raw IP address (203.0.113.9)",
      "booking link uses an international-character domain (xn--hrbourbistro-1db.co.nz)",
      "website link isn't a web address",
      "email domain not recognised (harbour-bistro-payments.com)",
    ]);
  });

  it("checks phone numbers and spots contact details in free text", () => {
    expect(plausibleNzPhone("09 123 4567")).toBe(true);
    expect(plausibleNzPhone("+64 21 123 4567")).toBe(true);
    expect(plausibleNzPhone("0800 123 456")).toBe(true);
    expect(plausibleNzPhone("+1 555 0100")).toBe(false);
    expect(contactInText("Book at www.example.com")).toBe("a web address");
    expect(contactInText("Email me at a@b.co")).toBe("an email address");
    expect(contactInText("Text 021 123 4567")).toBe("a phone number");
    expect(contactInText("Show the code at the counter before ordering.")).toBeNull();
  });
});
