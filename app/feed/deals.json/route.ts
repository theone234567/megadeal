import { NextRequest } from "next/server";
import { buildFeed, parseFeedFilters } from "@/lib/dealFeed";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { DEALS_OPEN, PRELAUNCH_HOME, SITE_LAUNCHED, SITE_NAME, SITE_URL } from "@/lib/siteConfig";

/**
 * The public deals feed: every live deal as JSON, with filters
 * (lib/dealFeed.ts; documented at /developers). Read-only, no sign-in,
 * open to any site (CORS). Kept off search results like /deals.txt: the
 * deal pages are what should rank.
 */
// Rendered for each request: the listing it reads keeps its own
// one-minute cache (fetchAllLiveDealsServer), as the homepage does.
export const dynamic = "force-dynamic";

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "X-Robots-Tag": "noindex",
  "X-Content-Type-Options": "nosniff",
  Link: `<${SITE_URL}/feed/openapi.json>; rel="describedby"; type="application/json", <${SITE_URL}/developers>; rel="help"`,
};

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { ...BASE_HEADERS, ...extra } });

async function etagOf(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hex = [...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `W/"${hex}"`;
}

export async function GET(req: NextRequest) {
  const parsed = parseFeedFilters(req.nextUrl.searchParams);
  if (!parsed.ok) return json({ error: parsed.error, docs: `${SITE_URL}/developers` }, 400, { "Cache-Control": "public, max-age=300" });

  let deals;
  try {
    deals = DEALS_OPEN ? await fetchAllLiveDealsServer() : [];
  } catch (err) {
    console.error("[feed/deals.json] listing failed", err);
    return json({ error: "The deals feed is unavailable right now. Please try again shortly." }, 503, { "Retry-After": "60", "Cache-Control": "no-store" });
  }

  const feed = buildFeed(deals, parsed.filters, {
    siteUrl: SITE_URL,
    siteName: SITE_NAME,
    launched: DEALS_OPEN,
    prelaunch: !SITE_LAUNCHED,
    frontPage: PRELAUNCH_HOME ? "/" : "/coming-soon",
  });
  // The ETag covers the deals and filters, not the time below, so a
  // client asking again gets "304 Not Modified" until something changes.
  const etag = await etagOf(JSON.stringify(feed));
  const caching = { "Cache-Control": "public, max-age=60, stale-while-revalidate=300", ETag: etag };
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((t) => t.trim() === etag)) {
    return new Response(null, { status: 304, headers: { ...BASE_HEADERS, ...caching } });
  }
  const { version, ...rest } = feed;
  return json({ version, generated_at: new Date().toISOString(), ...rest }, 200, caching);
}
