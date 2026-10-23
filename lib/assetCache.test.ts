import { describe, expect, it } from "vitest";
import { EDGE_CACHED_PATH, pageEdgeSeconds, withEdgeCache, withPageEdgeCache, withPrebuiltImage, withoutTrackingParams } from "./assetCache";

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

  it("serves an ad click (fbclid, gclid, utm_…) the page's edge copy, rendered without the tags", async () => {
    const cache = fakeCache();
    const seen: string[] = [];
    const handle = async (r: Request) => (seen.push(r.url), page());
    const c = ctx();
    await withPageEdgeCache(new Request("https://megadeal.co.nz/list-your-business?fbclid=AAA&utm_source=facebook&utm_campaign=launch"), c, cache, "v1", handle);
    await Promise.all(c.pending);
    await withPageEdgeCache(new Request("https://megadeal.co.nz/list-your-business?gclid=BBB"), ctx(), cache, "v1", handle);
    await withPageEdgeCache(new Request("https://megadeal.co.nz/list-your-business"), ctx(), cache, "v1", handle);
    // Rendered once, from the address without its tags; the other two from that copy.
    expect(seen).toEqual(["https://megadeal.co.nz/list-your-business"]);
    expect([...cache.store.keys()].join()).not.toMatch(/fbclid|gclid|utm_/);
  });

  it("still renders afresh for anything else in the query, tags or not", async () => {
    const cache = fakeCache();
    const seen: string[] = [];
    const handle = async (r: Request) => (seen.push(r.url), page());
    for (const u of ["https://megadeal.co.nz/list-your-business?ref=ABC123&fbclid=AAA", "https://megadeal.co.nz/?q=pizza&utm_source=x"]) {
      const c = ctx();
      await withPageEdgeCache(new Request(u), c, cache, "v1", handle);
      await Promise.all(c.pending);
    }
    expect(seen).toEqual(["https://megadeal.co.nz/list-your-business?ref=ABC123", "https://megadeal.co.nz/?q=pizza"]);
    expect(cache.store.size).toBe(0);
  });

  it("leaves pages that aren't kept at the edge exactly as asked for", async () => {
    const seen: string[] = [];
    await withPageEdgeCache(new Request("https://megadeal.co.nz/deal/pizza?fbclid=AAA"), ctx(), fakeCache(), "v1", async (r) => (seen.push(r.url), page()));
    expect(seen).toEqual(["https://megadeal.co.nz/deal/pizza?fbclid=AAA"]);
  });

  it("takes off only ad and campaign tags", () => {
    expect(withoutTrackingParams(new URL("https://megadeal.co.nz/about"))).toBeNull();
    expect(withoutTrackingParams(new URL("https://megadeal.co.nz/about?q=x"))).toBeNull();
    expect(withoutTrackingParams(new URL("https://megadeal.co.nz/about?utm_source=a&utm_medium=b&gbraid=c&msclkid=d&_gl=e&q=x"))?.toString()).toBe("https://megadeal.co.nz/about?q=x");
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

  it("keeps Next's prefetches of a page by their fingerprint, apart from the page and each other", async () => {
    const cache = fakeCache();
    let rendered = 0;
    const flight = (body: string) =>
      new Response(body, { status: 200, headers: { "Content-Type": "text/x-component", "Cache-Control": "no-cache, must-revalidate" } });
    const handle = async (r: Request) => (rendered++, new URL(r.url).search ? flight(`flight ${new URL(r.url).searchParams.get("_rsc")}`) : page());
    const prefetch = (rsc: string) =>
      new Request(`https://megadeal.co.nz/contact?_rsc=${rsc}`, { headers: { rsc: "1", "next-router-prefetch": "1", "next-url": "/help" } });
    const c = ctx();
    await withPageEdgeCache(prefetch("aaa"), c, cache, "v1", handle);
    await withPageEdgeCache(prefetch("bbb"), c, cache, "v1", handle);
    await withPageEdgeCache(new Request("https://megadeal.co.nz/contact"), c, cache, "v1", handle);
    await Promise.all(c.pending);
    expect(rendered).toBe(3);
    const again = await withPageEdgeCache(prefetch("aaa"), ctx(), cache, "v1", handle);
    expect(await again.text()).toBe("flight aaa");
    expect(again.headers.get("cache-control")).toBe("no-cache, must-revalidate");
    expect(await (await withPageEdgeCache(new Request("https://megadeal.co.nz/contact"), ctx(), cache, "v1", handle)).text()).toBe("<html>terms</html>");
    expect(rendered).toBe(3);
  });

  it("goes straight to the site for a prefetch with anything else in it, signed in, or not answered as page data", async () => {
    const cache = fakeCache();
    let rendered = 0;
    const c = ctx();
    const rsc = { rsc: "1", "next-router-prefetch": "1" };
    const asks = [
      new Request("https://megadeal.co.nz/contact?_rsc=aaa&ref=x", { headers: rsc }),
      new Request("https://megadeal.co.nz/contact?_rsc=aaa"), // no RSC header: not Next's request
      new Request("https://megadeal.co.nz/contact?_rsc=aaa", { headers: { ...rsc, cookie: "md_access=jwt" } }),
      new Request("https://megadeal.co.nz/portal?_rsc=aaa", { headers: rsc }),
    ];
    for (const r of asks) await withPageEdgeCache(r, c, cache, "v1", async () => (rendered++, page()));
    // Answered as HTML, not page data: not kept under a prefetch address.
    await withPageEdgeCache(new Request("https://megadeal.co.nz/help?_rsc=zzz", { headers: rsc }), c, cache, "v1", async () => (rendered++, page()));
    await Promise.all(c.pending);
    expect(cache.store.size).toBe(0);
    expect(rendered).toBe(5);
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
