import { describe, expect, it } from "vitest";
import { EDGE_CACHED_PATH, pageEdgeSeconds, withEdgeCache, withPageEdgeCache, withPrebuiltImage } from "./assetCache";

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

describe("page edge cache", () => {
  const page = (body = "<html>terms</html>", headers: Record<string, string> = {}) =>
    new Response(body, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache, must-revalidate", ...headers } });

  it("keeps fixed pages an hour, the homepage five minutes, the Auckland listings a minute, nothing private", () => {
    for (const p of ["/terms", "/help", "/list-your-business", "/advertise/home-car", "/robots.txt"]) expect(pageEdgeSeconds(p), p).toBe(3600);
    expect(pageEdgeSeconds("/")).toBe(300);
    for (const p of ["/auckland", "/auckland/food-drink"]) expect(pageEdgeSeconds(p), p).toBe(60);
    for (const p of ["/portal", "/admin", "/api/version", "/deal/pizza", "/business/x", "/reset-password", "/stop-emails", "/unsubscribe", "/auckland/x/y"]) {
      expect(pageEdgeSeconds(p), p).toBe(0);
    }
  });

  it("renders a page once per deploy, and gives the browser the page's own caching rule", async () => {
    const cache = fakeCache();
    let rendered = 0;
    const handle = async () => (rendered++, page());
    const c = ctx();
    await withPageEdgeCache(new Request("https://megadeal.co.nz/terms"), c, cache, "v1", handle);
    await Promise.all(c.pending);
    const again = await withPageEdgeCache(new Request("https://megadeal.co.nz/terms"), ctx(), cache, "v1", handle);
    expect(await again.text()).toBe("<html>terms</html>");
    expect(again.headers.get("cache-control")).toBe("no-cache, must-revalidate");
    expect(again.headers.get("x-md-browser-cache-control")).toBeNull();
    expect(rendered).toBe(1);
    // A new deploy starts afresh.
    await withPageEdgeCache(new Request("https://megadeal.co.nz/terms"), ctx(), cache, "v2", handle);
    expect(rendered).toBe(2);
  });

  it("goes straight to the site for anyone signed in, any query, Next's navigation, and without a deploy id", async () => {
    const cache = fakeCache();
    let rendered = 0;
    const handle = async () => (rendered++, page());
    const c = ctx();
    const asks = [
      new Request("https://megadeal.co.nz/", { headers: { cookie: "theme=x; admin_session=abc" } }),
      new Request("https://megadeal.co.nz/", { headers: { cookie: "md_access=jwt" } }),
      new Request("https://megadeal.co.nz/?q=pizza"),
      new Request("https://megadeal.co.nz/list-your-business?ref=MD123456"),
      new Request("https://megadeal.co.nz/terms", { headers: { rsc: "1" } }),
      new Request("https://megadeal.co.nz/terms", { method: "POST", body: "x" }),
    ];
    for (const r of asks) await withPageEdgeCache(r, c, cache, "v1", handle);
    await withPageEdgeCache(new Request("https://megadeal.co.nz/terms"), c, cache, undefined, handle);
    await Promise.all(c.pending);
    expect(cache.store.size).toBe(0);
    expect(rendered).toBe(7);
  });

  it("never keeps an error, a redirect, a private answer or one setting a cookie", async () => {
    const cache = fakeCache();
    const c = ctx();
    const answers = [
      new Response("err", { status: 503 }),
      new Response(null, { status: 307, headers: { Location: "/coming-soon" } }),
      page("x", { "Cache-Control": "private, no-store" }),
      page("x", { "Set-Cookie": "a=b" }),
      new Response("png", { status: 200, headers: { "Content-Type": "image/png" } }),
    ];
    for (const a of answers) await withPageEdgeCache(new Request("https://megadeal.co.nz/"), c, cache, "v1", async () => a);
    await Promise.all(c.pending);
    expect(cache.store.size).toBe(0);
  });
});

describe("prebuilt images", () => {
  const assets = (files: Record<string, string>) => {
    const asked: string[] = [];
    return {
      asked,
      fetch: async (r: Request) => {
        const p = new URL(r.url).pathname;
        asked.push(p);
        return p in files ? new Response(files[p], { status: 200 }) : new Response("", { status: 404 });
      },
    };
  };

  it("answers share images and icons with the copy drawn at build time, without drawing", async () => {
    const a = assets({ "/cdn-cgi/_prebuilt/opengraph-image.png": "og", "/cdn-cgi/_prebuilt/advertise/home-car/opengraph-image.png": "car", "/cdn-cgi/_prebuilt/icon.png": "icon", "/cdn-cgi/_prebuilt/favicon.ico": "ico" });
    const draw = async () => new Response("drawn");
    const og = await withPrebuiltImage(new Request("https://megadeal.co.nz/opengraph-image?9ccc"), a, draw);
    expect(await og.text()).toBe("og");
    expect(og.headers.get("content-type")).toBe("image/png");
    expect(og.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(await (await withPrebuiltImage(new Request("https://megadeal.co.nz/advertise/home-car/opengraph-image"), a, draw)).text()).toBe("car");
    expect(await (await withPrebuiltImage(new Request("https://megadeal.co.nz/icon.png"), a, draw)).text()).toBe("icon");
    const ico = await withPrebuiltImage(new Request("https://megadeal.co.nz/favicon.ico"), a, draw);
    expect(ico.headers.get("content-type")).toBe("image/x-icon");
  });

  it("draws as before when there's no copy, and leaves everything else alone", async () => {
    const a = assets({});
    const draw = async () => new Response("drawn");
    expect(await (await withPrebuiltImage(new Request("https://megadeal.co.nz/deal/pizza/opengraph-image"), a, draw)).text()).toBe("drawn");
    expect(await (await withPrebuiltImage(new Request("https://megadeal.co.nz/terms"), a, draw)).text()).toBe("drawn");
    expect(await (await withPrebuiltImage(new Request("https://megadeal.co.nz/opengraph-image"), undefined, draw)).text()).toBe("drawn");
    expect(a.asked).toEqual(["/cdn-cgi/_prebuilt/deal/pizza/opengraph-image.png"]);
  });
});
