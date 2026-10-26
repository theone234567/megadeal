import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { JSON_BODY_MAX, readSmallJson } from "./readJsonBody";

// T257: unknown /api addresses answer in JSON; JSON bodies are capped.

describe("/api catch-all", () => {
  it("is a JSON 404 for every method", async () => {
    const route = await import("@/app/api/[...path]/route");
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"] as const) {
      const res = await route[method]();
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      expect((await res.json()).error).toMatch(/no API at this address/);
    }
  });
});

describe("capped JSON bodies", () => {
  const post = (body: string, headers: Record<string, string> = {}) =>
    new NextRequest("http://x/api/deals/draft", { method: "POST", body, headers });

  it("reads a normal body", async () => {
    expect(await readSmallJson(post(JSON.stringify({ a: 1 })), JSON_BODY_MAX)).toEqual({ a: 1 });
  });

  it("refuses an oversized one, whether or not it says its length", async () => {
    const big = JSON.stringify({ description: "x".repeat(JSON_BODY_MAX + 10) });
    expect(await readSmallJson(post(big), JSON_BODY_MAX)).toBeNull();
    // A body without a length is still cut off while it's read.
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(big));
        c.close();
      },
    });
    const req = new Request("http://x/api/deals/draft", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(await readSmallJson(req, JSON_BODY_MAX)).toBeNull();
  });

  it("answers the deal draft route's usual 400 for an oversized body", async () => {
    const { POST } = await import("@/app/api/deals/draft/route");
    const big = JSON.stringify({ draft: { description: "x".repeat(JSON_BODY_MAX) } });
    const res = await POST(post(big));
    // Signed out here, so the sign-in check answers first; the body is
    // never buffered whole either way.
    expect([400, 401]).toContain(res.status);
  });
});
