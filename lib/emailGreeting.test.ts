import { describe, expect, it } from "vitest";
import { greetingHtml, greetingName } from "./emailGreeting";

describe("who a business email says hello to", () => {
  it("is the contact's first name", () => {
    expect(greetingName("Sam Smith", "Harbour Bistro")).toBe("Sam");
    expect(greetingName("  Mary-Jane O'Neil ", "Harbour Bistro")).toBe("Mary-Jane");
    expect(greetingName("Dr. Aroha Ngata", "Harbour Bistro")).toBe("Aroha");
    expect(greetingName("Mátai", "Harbour Bistro")).toBe("Mátai");
  });

  it("tidies a name typed all in capitals or lower case, and leaves mixed case alone", () => {
    expect(greetingName("SAM SMITH", "x")).toBe("Sam");
    expect(greetingName("sam", "x")).toBe("Sam");
    expect(greetingName("DeShawn", "x")).toBe("DeShawn");
  });

  it("falls back to the business name, then 'there', when there's no usable first name", () => {
    expect(greetingName("J. Smith", "Harbour Bistro")).toBe("Harbour Bistro");
    expect(greetingName("sam@bistro.nz", "Harbour Bistro")).toBe("Harbour Bistro");
    expect(greetingName("021 555 1234", "Harbour Bistro")).toBe("Harbour Bistro");
    expect(greetingName("", "Harbour Bistro")).toBe("Harbour Bistro");
    expect(greetingName(null, "  ")).toBe("there");
    expect(greetingName(undefined, null)).toBe("there");
  });

  it("is escaped in the email", () => {
    expect(greetingHtml(null, "Fish & <Chips>")).toContain("Hi Fish &amp; &lt;Chips&gt;,");
  });
});
