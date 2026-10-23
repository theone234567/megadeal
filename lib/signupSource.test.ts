import { describe, expect, it } from "vitest";
import { describeSignupSource, signupSourceFrom } from "./signupSource";

describe("signupSourceFrom", () => {
  it("keeps the campaign, which network's click, the page and the other site's name", () => {
    expect(
      signupSourceFrom({
        utm_source: "facebook", utm_medium: "paid", utm_campaign: "spring-cafes", fbclid: "IwAR-secret-click-id",
        landingPage: "/advertise/restaurants", referrer: "https://l.facebook.com/l.php?u=private-stuff", capturedAt: "2026-10-23T01:00:00Z",
      })
    ).toEqual({
      utm_source: "facebook", utm_medium: "paid", utm_campaign: "spring-cafes", adClick: "facebook",
      landingPage: "/advertise/restaurants", referrerHost: "l.facebook.com", firstVisit: "2026-10-23T01:00:00.000Z",
    });
  });

  it("never keeps the click id or the full address they came from", () => {
    const s = JSON.stringify(signupSourceFrom({ gclid: "Cj0KCQ-secret", referrer: "https://www.google.com/search?q=private" }));
    expect(s).not.toContain("secret");
    expect(s).not.toContain("private");
    expect(s).toContain('"adClick":"google"');
  });

  it("drops junk, markup and nothing-to-say", () => {
    expect(signupSourceFrom(null)).toBeNull();
    expect(signupSourceFrom("facebook")).toBeNull();
    expect(signupSourceFrom({ landingPage: "/list-your-business", capturedAt: "2026-10-23T01:00:00Z" })).toBeNull();
    expect(signupSourceFrom({ utm_source: "<script>x</script>", landingPage: "javascript:alert(1)", referrer: "javascript:alert(1)" })).toEqual({ utm_source: "scriptx/script" });
  });
});

describe("describeSignupSource", () => {
  it("says it in a few words", () => {
    expect(describeSignupSource({ adClick: "facebook", utm_campaign: "spring-cafes", utm_content: "video-1" })).toBe("Facebook ad · campaign spring-cafes · ad video-1");
    expect(describeSignupSource({ adClick: "google" })).toBe("Google ad");
    expect(describeSignupSource({ referrerHost: "www.google.co.nz" })).toBe("Google search");
    expect(describeSignupSource({ referrerHost: "l.instagram.com" })).toBe("Instagram");
    expect(describeSignupSource({ referrerHost: "neighbourly.co.nz" })).toBe("From neighbourly.co.nz");
    expect(describeSignupSource({ utm_source: "newsletter", utm_medium: "email" })).toBe("newsletter (email)");
    expect(describeSignupSource(null)).toBeNull();
  });
});
