import { afterEach, describe, expect, it, vi } from "vitest";

/** The shared rate limiter (lib/rateLimit.ts), on a stand-in for Cloudflare KV. */

let kv: { get: (k: string) => Promise<string | null>; put: (k: string, v: string, o?: unknown) => Promise<void>; delete: (k: string) => Promise<void> };
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: { RATE_LIMIT_KV: kv } }) }));
const { checkRateLimit } = await import("./rateLimit");

function memoryKv() {
  const m = new Map<string, string>();
  return { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => void m.set(k, v), delete: async (k: string) => void m.delete(k) };
}

afterEach(() => vi.restoreAllMocks());

describe("rate limits", () => {
  it("allows up to the limit in a window, then refuses", async () => {
    kv = memoryKv();
    for (let i = 0; i < 3; i++) expect((await checkRateLimit("t:a", 3, 60)).limited).toBe(false);
    expect((await checkRateLimit("t:a", 3, 60)).limited).toBe(true);
    expect((await checkRateLimit("t:b", 3, 60)).limited).toBe(false);
  });

  it("lets the request through when Cloudflare won't save the count (daily allowance used up)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    kv = { ...memoryKv(), put: async () => Promise.reject(new Error("KV PUT failed: 429 Too Many Requests")) };
    await expect(checkRateLimit("t:c", 3, 60)).resolves.toEqual({ limited: false });
  });

  it("lets the request through when the count can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    kv = { ...memoryKv(), get: async () => Promise.reject(new Error("KV unavailable")) };
    await expect(checkRateLimit("t:d", 3, 60)).resolves.toEqual({ limited: false });
  });
});
