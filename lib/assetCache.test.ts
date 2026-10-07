import { describe, expect, it } from "vitest";
import { EDGE_CACHED_PATH, withEdgeCache } from "./assetCache";

/** Share images and icons, kept at the edge for a day (worker.mjs). */

function fakeCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: async (k: Request) => store.get(k.url)?.clone(),
    put: async (k: Request, r: Response) => void store.set(k.url, r),
  };
}
const ctx = () => {
  const pending: Promise<unknown>[] = [];
  return { pending, waitUntil: (p: Promise<unknown>) => void pending.push(p) };
};

describe("edge cache", () => {
  it("covers share images and icons, and nothing else", () => {
    for (const p of ["/opengraph-image", "/coming-soon/opengraph-image", "/list-your-business/opengraph-image", "/advertise/home-car/opengraph-image", "/twitter-image", "/icon.png", "/apple-icon.png"]) {
      expect(EDGE_CACHED_PATH.test(p), p).toBe(true);
    }
    for (const p of ["/", "/about", "/deal/pizza", "/api/health", "/portal", "/admin", "/opengraph-images", "/media/photos/x.png"]) {
      expect(EDGE_CACHED_PATH.test(p), p).toBe(false);
    }
  });

  it("draws an image once, then answers from the copy", async () => {
    const cache = fakeCache();
    let drawn = 0;
    const handle = async () => (drawn++, new Response("png", { status: 200, headers: { "Content-Type": "image/png", "Set-Cookie": "a=b" } }));
    const c = ctx();
    const first = await withEdgeCache(new Request("https://megadeal.co.nz/opengraph-image?abc"), c, cache, handle);
    await Promise.all(c.pending);
    expect(await first.text()).toBe("png");
    const second = await withEdgeCache(new Request("https://megadeal.co.nz/opengraph-image?abc", { headers: { cookie: "x=y" } }), ctx(), cache, handle);
    expect(await second.text()).toBe("png");
    expect(drawn).toBe(1);
    const kept = cache.store.get("https://megadeal.co.nz/opengraph-image?abc")!;
    expect(kept.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(kept.headers.get("set-cookie")).toBeNull();
  });

  it("never keeps an error, a page, or anything but a GET", async () => {
    const cache = fakeCache();
    const c = ctx();
    await withEdgeCache(new Request("https://megadeal.co.nz/opengraph-image"), c, cache, async () => new Response("err", { status: 500 }));
    await withEdgeCache(new Request("https://megadeal.co.nz/about"), c, cache, async () => new Response("ok"));
    await withEdgeCache(new Request("https://megadeal.co.nz/icon.png", { method: "HEAD" }), c, cache, async () => new Response(null));
    await Promise.all(c.pending);
    expect(cache.store.size).toBe(0);
  });

  it("works without a cache (local development)", async () => {
    const res = await withEdgeCache(new Request("https://megadeal.co.nz/icon.png"), ctx(), undefined, async () => new Response("icon"));
    expect(await res.text()).toBe("icon");
  });
});
