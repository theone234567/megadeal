import { NextResponse, type NextRequest } from "next/server";
import { SITE_LAUNCHED, SITE_URL } from "@/lib/siteConfig";
import { categoryByLegacySegment, categoryBySlug } from "@/lib/categories";
import { ADMIN_COOKIE_NAME, hasValidAdminSignature } from "@/lib/adminCookie";

const CANONICAL_HOST = new URL(SITE_URL).hostname;

/**
 * This codebase is still git-connected to a Vercel project left over from
 * before the move to Cloudflare Workers (megadeal23456.vercel.app) — it
 * kept auto-deploying every push in parallel with the real site, and Bing
 * indexed it as a live duplicate. A permanent redirect to the canonical
 * host is the strongest signal to get a search engine to drop a stray
 * domain in favor of the real one, far more than a canonical tag or
 * robots.txt alone, and it also catches any other stray host this same
 * build ever ends up served from (a Cloudflare preview *.workers.dev URL,
 * a future duplicate deployment) without needing to know about it here.
 * Skips localhost/127.0.0.1 so local dev and the CI preview step (which
 * hits localhost:8787) aren't redirected into a live domain.
 * vercel.json now also switches that project's Git deployments off; the
 * real site is built and deployed by Cloudflare Workers Builds.
 */
function isCanonicalHost(host: string) {
  return host === CANONICAL_HOST || host === "localhost" || host === "127.0.0.1";
}

/**
 * Pre-launch gate only. This used to also proactively fetch and cookie a
 * Wix visitor token for any request with no "session" cookie yet — a live
 * call to Wix's OAuth endpoint, capped at 1.2s, sitting in front of every
 * first-touch page load (and, since that cookie carried no maxAge, every
 * new browser session, not just first-ever visits).
 *
 * It bought one thing: WixProvider's client-side Wix client could start
 * with a pre-seeded visitor token instead of generating its own on first
 * use. Nothing else ever read that cookie — checked every server route
 * and every component in this codebase; the only consumer was that one
 * optional constructor argument. And the client already generates its own
 * visitor tokens on demand when something actually needs them (Custom
 * Login's register/login/verify, or a captcha site key) — confirmed by
 * how sign-in/sign-up already worked before this cookie existed for
 * anything. The overwhelming majority of page views — someone browsing
 * deals, reading a static page — never touch a Wix visitor token at all.
 *
 * So this was a guaranteed, synchronous cost on the critical path of
 * nearly every request, buying a client-side optimization only a minority
 * of visits ever cashed in. Worse for SEO than it looks: Core Web Vitals
 * field data (TTFB in particular) comes from real visitor traffic and
 * factors into ranking, so this was working against the SEO fixes
 * elsewhere in this codebase, quietly, since a bounded 1.2s timeout never
 * surfaces as a visible error.
 *
 * Removed rather than tuned. The token generation still happens — just
 * lazily, client-side, only in the three flows that actually call
 * client.auth (MerchantSignupForm, MerchantLoginForm, /login-callback) —
 * exactly where ChatGPT's original review of this codebase suggested
 * deferring it to.
 */
export async function middleware(request: NextRequest) {
  if (!isCanonicalHost(request.nextUrl.hostname)) {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname + request.nextUrl.search, SITE_URL),
      308
    );
  }

  // Category URLs moved from the percent-encoded display name
  // (/category/Food%20%26%20Drink) to a slug (/category/food-drink). Done
  // here rather than in the page with permanentRedirect(): that page
  // streams, and a redirect thrown mid-stream can degrade to a client-side
  // meta refresh, which search engines don't treat as a permanent move.
  // Query strings (e.g. ?city=) carry over.
  const categoryMatch = request.nextUrl.pathname.match(/^\/category\/([^/]+)\/?$/);
  if (categoryMatch && !categoryBySlug(categoryMatch[1])) {
    const category = categoryByLegacySegment(categoryMatch[1]);
    if (category) {
      const target = request.nextUrl.clone();
      target.pathname = `/category/${category.slug}`;
      return NextResponse.redirect(target, 308);
    }
  }

  const path = request.nextUrl.pathname;

  // After launch the coming-soon page has nothing left to say, and it's
  // the page search engines were told (by the 308 below) to index in
  // place of "/". Sending it back to "/" permanently hands that standing
  // to the real homepage instead of leaving a stale "launching soon" page
  // competing with it. no-store for the same reason as below: if the site
  // were ever taken back to pre-launch, a browser that remembered this
  // redirect would bounce between the two.
  if (SITE_LAUNCHED && path === "/coming-soon") {
    const res = NextResponse.redirect(new URL("/", request.url), 308);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // Coming-soon V2 preview (lib/siteConfig.ts COMING_SOON_DESIGN): a
  // signed-in admin sees the new design at /coming-soon?design=v2 while
  // everyone else keeps the current one. The internal preview address is
  // admin-only too. Never cached, never indexed.
  if (path === "/coming-soon/v2-preview" || (path === "/coming-soon" && request.nextUrl.searchParams.get("design") === "v2")) {
    const admin = await hasValidAdminSignature(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (path === "/coming-soon" && !admin) return; // the normal page
    const res = admin
      ? NextResponse.rewrite(new URL("/coming-soon/v2-preview", request.url))
      : NextResponse.redirect(new URL("/coming-soon", request.url), 307);
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Same for the /list-your-business redesign (LIST_BUSINESS_DESIGN):
  // /list-your-business?design=v2 shows it to a signed-in admin only.
  if (
    path === "/list-your-business/v2-preview" ||
    (path === "/list-your-business" && request.nextUrl.searchParams.get("design") === "v2")
  ) {
    const admin = await hasValidAdminSignature(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (path === "/list-your-business" && !admin) return; // the normal page
    const preview = new URL("/list-your-business/v2-preview", request.url);
    // Keeps ?ref= so a referral link can be tried in the preview.
    const ref = request.nextUrl.searchParams.get("ref");
    if (ref) preview.searchParams.set("ref", ref);
    const res = admin ? NextResponse.rewrite(preview) : NextResponse.redirect(new URL("/list-your-business", request.url), 307);
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  if (!SITE_LAUNCHED && (path === "/" || PRELAUNCH_PRIVATE.test(path))) {
    // Admin preview: before launch the customer side is visible only to
    // someone signed into /admin, so test deals from a real business
    // account can be checked end to end exactly as they'll look at launch.
    if (await hasValidAdminSignature(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
      const res = NextResponse.next();
      // Belt and braces on top of each page's own pre-launch noindex, and
      // never cached anywhere a non-admin could be served it.
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    }

    // "/" keeps its 308, not the 307 default: a temporary redirect tells
    // search engines "don't replace the indexed page, the real content is
    // still here" — but "/" itself has no content at all pre-launch, so a
    // temporary redirect left Google with nothing to build a
    // title/description from and it showed just the bare site name. 308
    // tells it to index /coming-soon in place of "/" instead. The other
    // routes get a 307: they're real pages from launch day.
    //
    // no-store on both: browsers otherwise remember a permanent redirect
    // indefinitely, so everyone who visited before launch would keep being
    // sent to /coming-soon after it — and the admin couldn't preview "/".
    const res = NextResponse.redirect(new URL("/coming-soon", request.url), path === "/" ? 308 : 307);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}

/** The customer-facing routes that stay admin-only until launch. */
const PRELAUNCH_PRIVATE = /^\/(?:category|deal|flash-deals|business)(?:\/|$)/;

export const config = {
  // Unchanged: static/generated utility routes and every API route never
  // need this middleware to run at all — skipping it keeps Google's
  // sitemap crawler (and everything else hitting those paths) off this
  // function's critical path entirely, which matters even more now that
  // this function is meant to be the fast, boring case for everyone else.
  matcher: [
    "/((?!(?:.*/)?(?:favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|opengraph-image|(?:apple-)?icon(?:\\.png)?|security\\.txt)(?:/.*)?$)(?!_next/static|_next/image|.well-known|api/).*)",
  ],
};
