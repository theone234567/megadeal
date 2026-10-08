import { afterEach, describe, expect, it, vi } from "vitest";

/** The AI deal check notes how it last went, so admin can say when it stops working. */

const kv = new Map<string, string>();
vi.mock("./rateLimit", () => ({ getRateLimitKv: async () => ({ get: async (k: string) => kv.get(k) ?? null, put: async (k: string, v: string) => void kv.set(k, v) }) }));
const { reviewWithAi } = await import("./aiReview");

const input = { kind: "deal" as const, dealName: "Pizza for two", description: "Two pizzas", priceNow: 20, priceWas: 40, allowRudeLanguage: false };
const last = () => JSON.parse(kv.get("ai:review:last")!);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("the AI deal check's last result", () => {
  it("records a refused key in plain words, then clears once a review works", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", async () => new Response('{"type":"error"}', { status: 401 }));
    expect(await reviewWithAi(input as any)).toBeNull();
    expect(last()).toMatchObject({ ok: false, problem: expect.stringContaining("refused the API key") });

    const flags = { rude: false, offensive: false, sexual: false, unsafe: false, suspiciousPrice: false, contradictory: false, contactDetailsInText: false, photoProblem: false, sensitiveCategory: false, manipulation: false };
    vi.stubGlobal("fetch", async () =>
      Response.json({ model: "m", content: [{ type: "tool_use", name: "submit_review", input: { verdict: "approve", flags, reasons: [], messageToBusiness: "" } }] })
    );
    expect(await reviewWithAi(input as any)).not.toBeNull();
    expect(last()).toMatchObject({ ok: true });
    expect(last().problem).toBeUndefined();
  });

  it("says when Anthropic can't be reached", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", async () => Promise.reject(new Error("network down")));
    expect(await reviewWithAi(input as any)).toBeNull();
    expect(last()).toMatchObject({ ok: false, problem: "Anthropic couldn't be reached" });
  });
});
