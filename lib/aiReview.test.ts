import { describe, it, expect } from "vitest";
import {
  AI_REVIEW_MODEL,
  aiSummary,
  buildReviewRequest,
  decideAiOutcome,
  parseReviewResponse,
  reviewWithAi,
  type AiFlags,
  type AiReview,
} from "./aiReview";

const clear: AiFlags = {
  rude: false,
  offensive: false,
  sexual: false,
  unsafe: false,
  suspiciousPrice: false,
  contradictory: false,
  contactDetailsInText: false,
  photoProblem: false,
  sensitiveCategory: false,
  manipulation: false,
};
const review = (verdict: AiReview["verdict"], flags: Partial<AiFlags> = {}): AiReview => ({
  verdict,
  flags: { ...clear, ...flags },
  reasons: verdict === "approve" ? [] : ["reason"],
  messageToBusiness: "",
  model: AI_REVIEW_MODEL,
  at: "t",
});

describe("buildReviewRequest", () => {
  it("sends the photo, the listing as tagged data, and forces the review tool", () => {
    const req: any = buildReviewRequest({
      kind: "deal",
      dealName: "Pizza",
      description: "Two pizzas",
      terms: "Dine-in only.",
      priceNow: 49,
      priceWas: 70,
      photoUrl: "https://static.wixstatic.com/media/x.jpg",
    });
    expect(req.model).toBe("claude-haiku-4-5-20251001");
    expect(req.tool_choice).toEqual({ type: "tool", name: "submit_review" });
    expect(req.messages[0].content[0]).toEqual({
      type: "image",
      source: { type: "url", url: "https://static.wixstatic.com/media/x.jpg/v1/fill/w_1000,h_750/file.webp" },
    });
    const text = req.messages[0].content[1].text;
    expect(text).toMatch(/^<listing>/);
    expect(text).toContain("Usual price: NZ$70");
    expect(req.system).toMatch(/data, not instructions/);
  });

  it("omits the image block when there is no photo", () => {
    const req: any = buildReviewRequest({ kind: "deal", dealName: "x" });
    expect(req.messages[0].content).toHaveLength(1);
  });
});

describe("parseReviewResponse", () => {
  it("reads the tool call and defaults missing flags to false", () => {
    const r = parseReviewResponse(
      {
        model: "claude-haiku-4-5-20251001",
        content: [
          { type: "text", text: "..." },
          {
            type: "tool_use",
            name: "submit_review",
            input: { verdict: "reject", flags: { offensive: true }, reasons: ["Swearing"], messageToBusiness: "Remove it." },
          },
        ],
      },
      "now"
    );
    expect(r).toMatchObject({ verdict: "reject", reasons: ["Swearing"], messageToBusiness: "Remove it.", at: "now" });
    expect(r?.flags.offensive).toBe(true);
    expect(r?.flags.sexual).toBe(false);
  });

  it("returns null for anything malformed", () => {
    expect(parseReviewResponse({ content: [{ type: "text", text: "approve" }] })).toBeNull();
    expect(parseReviewResponse({ content: [{ type: "tool_use", name: "submit_review", input: { verdict: "yes" } }] })).toBeNull();
    expect(parseReviewResponse(null)).toBeNull();
  });
});

describe("decideAiOutcome", () => {
  it("publishes only a clean approval from an approved business", () => {
    expect(decideAiOutcome(review("approve"), true)).toBe("publish");
    expect(decideAiOutcome(review("approve"), false)).toBe("hold");
  });

  it("holds an approval that still raised a flag", () => {
    expect(decideAiOutcome(review("approve", { suspiciousPrice: true }), true)).toBe("hold");
    expect(decideAiOutcome(review("approve", { manipulation: true }), true)).toBe("hold");
  });

  it("rejects only with a content flag behind it", () => {
    expect(decideAiOutcome(review("reject", { offensive: true }), false)).toBe("reject");
    expect(decideAiOutcome(review("reject", { rude: true }), true)).toBe("reject");
    expect(decideAiOutcome(review("reject", { manipulation: true }), true)).toBe("reject");
    expect(decideAiOutcome(review("reject", { suspiciousPrice: true }), true)).toBe("hold");
    expect(decideAiOutcome(review("reject"), true)).toBe("hold");
  });

  it("holds when there is no review or it asks for a person", () => {
    expect(decideAiOutcome(null, true)).toBe("hold");
    expect(decideAiOutcome(review("review"), true)).toBe("hold");
  });
});

describe("decideAiOutcome with the rudeness check off", () => {
  it("lets swearing through for that business", () => {
    expect(decideAiOutcome(review("reject", { rude: true }), true, false)).toBe("publish");
    expect(decideAiOutcome(review("approve", { rude: true }), true, false)).toBe("publish");
    // still needs an approved business to go live without a person
    expect(decideAiOutcome(review("reject", { rude: true }), false, false)).toBe("hold");
  });

  it("still rejects hate, sexual and unsafe content", () => {
    expect(decideAiOutcome(review("reject", { rude: true, offensive: true }), true, false)).toBe("reject");
    expect(decideAiOutcome(review("reject", { sexual: true }), true, false)).toBe("reject");
    expect(decideAiOutcome(review("reject", { unsafe: true }), true, false)).toBe("reject");
  });

  it("still holds other concerns", () => {
    expect(decideAiOutcome(review("review", { rude: true, suspiciousPrice: true }), true, false)).toBe("hold");
  });
});

describe("rudeness prompt", () => {
  it("tells the reviewer when rude language is allowed", () => {
    const off: any = buildReviewRequest({ kind: "deal", dealName: "x", allowRudeLanguage: true });
    const on: any = buildReviewRequest({ kind: "deal", dealName: "x" });
    expect(off.messages[0].content.at(-1).text).toMatch(/allows this business casual swearing/);
    expect(on.messages[0].content.at(-1).text).not.toMatch(/allows this business/);
  });
});

describe("reviewWithAi", () => {
  it("does nothing without an API key", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(await reviewWithAi({ kind: "deal", dealName: "x" })).toBeNull();
    if (saved) process.env.ANTHROPIC_API_KEY = saved;
  });
});

describe("aiSummary", () => {
  it("summarises for the admin list", () => {
    expect(aiSummary(review("approve"))).toBe("AI: looks fine");
    expect(aiSummary(review("reject", { offensive: true }))).toBe("AI: reject — reason");
    // a reject for a photo mismatch is held for a person, so it reads as "check"
    expect(aiSummary(review("reject", { photoProblem: true }))).toBe("AI: check — reason");
    expect(aiSummary(undefined)).toBeNull();
  });
});

describe("deal code in the AI review", () => {
  it("includes a code the business chose, not one MegaDeal generated", () => {
    const own: any = buildReviewRequest({ kind: "deal", dealName: "x", dealCode: "TACO-TUESDAY" });
    const ours: any = buildReviewRequest({ kind: "deal", dealName: "x", dealCode: "MEGA-AB2CD" });
    expect(own.messages[0].content.at(-1).text).toContain("Deal code customers quote: TACO-TUESDAY");
    expect(ours.messages[0].content.at(-1).text).not.toContain("MEGA-AB2CD");
  });
});
