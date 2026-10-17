import { NextResponse, type NextRequest } from "next/server";
import { DEALS_OPEN, PRELAUNCH_HOME, SITE_LAUNCHED, SITE_URL } from "@/lib/siteConfig";
import { categoryByLegacySegment, categoryBySlug, categoryPath } from "@/lib/categories";
import { ADMIN_COOKIE_NAME, hasValidAdminSignature } from "@/lib/adminCookie";
import { blockedForMaintenance, MAINTENANCE_MESSAGE } from "@/lib/maintenance";
import { RESET_COOKIE, RESET_TOKEN_RE } from "@/lib/sensitivePaths";
import { isCrossSiteWrite } from "@/lib/crossSiteWrite";

// Next 16 renames this file to proxy.ts (middleware is deprecated, a
// build warning only). Not done on purpose: a proxy always runs as
// Node.js, which OpenNext's Cloudflare adapter (1.20) calls experimental
// and unmaintained, and this file is the site's front door (redirects,
// the coming-soon gate, maintenance). Revisit when OpenNext supports it.

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
 * Pre-launch gate only: nothing here calls out to another service, so it
 * adds nothing to the time a page takes (Core Web Vitals field data, TTFB
 * in particular, factors into search ranking).
 */
export async function middleware(request: NextRequest) {
  // API requests come here only for the switch-over pause
  // (lib/maintenance.ts); otherwise they go straight on, untouched.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (isCrossSiteWrite(request, CANONICAL_HOST)) {
      return NextResponse.json(
        { error: "Please use the form on megadeal.co.nz." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (!blockedForMaintenance(request.method, request.nextUrl.pathname)) {
      // Signed-in and personal answers (admin, the business portal,
      // sign-in, a business's deals, uploads) are never kept by a browser
      // or any shared cache.
      const res = NextResponse.next();
      if (PRIVATE_API.test(request.nextUrl.pathname)) res.headers.set("Cache-Control", "private, no-store");
      return res;
    }
    return NextResponse.json(
      { error: MAINTENANCE_MESSAGE },
      { status: 503, headers: { "Retry-After": "1800", "Cache-Control": "no-store" } }
    );
  }

  if (!isCanonicalHost(request.nextUrl.hostname)) {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname + request.nextUrl.search, SITE_URL),
      308
    );
  }

  // A password-reset link (/reset-password?token=…): the token moves into
  // an HttpOnly cookie and the browser is sent on to the plain address,
  // before any page or script loads. So the token never sits in the
  // address bar, where analytics, advertising or browser extensions could
  // read it, nor in history or a Referer (security audit 10 Oct 2026,
  // finding 1). The page itself is never cached or indexed.
  if (request.nextUrl.pathname === "/reset-password") {
    const token = request.nextUrl.searchParams.get("token");
    const res =
      token === null
        ? NextResponse.next()
        : NextResponse.redirect(new URL("/reset-password", request.url), 303);
    if (token !== null) {
      if (RESET_TOKEN_RE.test(token)) {
        res.cookies.set(RESET_COOKIE, token, {
          httpOnly: true,
          secure: request.nextUrl.protocol === "https:",
          // Lax, not Strict: the link is opened from an email, a
          // cross-site visit, and the page needs the cookie on arrival.
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 60,
        });
      } else {
        res.cookies.delete(RESET_COOKIE);
      }
    }
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // The business "unsubscribe" page carries its signed link in the
  // address (lib/businessEmailOptOut.ts): never cached, indexed or sent
  // on as a Referer (and no tracking script runs there, Trackers.tsx).
  if (request.nextUrl.pathname === "/stop-emails") {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // An address with broken percent-encoding (/deal/%E0%A4%A, from a
  // mangled link) can't be decoded, and Next answered it with a 500.
  // Search engines read repeated 500s as an unhealthy site; it's simply
  // not a page.
  try {
    decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" } });
  }

  // Category URLs moved from the percent-encoded display name
  // (/category/Food%20%26%20Drink) to a slug, now under the city
  // (/auckland/food-drink; next.config.mjs sends /category/* here). Done
  // here rather than in the page with permanentRedirect(): that page
  // streams, and a redirect thrown mid-stream can degrade to a client-side
  // meta refresh, which search engines don't treat as a permanent move.
  // Query strings (e.g. ?city=) carry over.
  const categoryMatch = request.nextUrl.pathname.match(/^\/(?:category|auckland)\/([^/]+)\/?$/);
  if (categoryMatch && !categoryBySlug(categoryMatch[1])) {
    const category = categoryByLegacySegment(categoryMatch[1]);
    if (category) {
      const target = request.nextUrl.clone();
      target.pathname = categoryPath(category.name);
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

  // With the public prelaunch homepage (PRELAUNCH_HOME), "/" is the front
  // door before launch too: /coming-soon hands it its standing, the same
  // way it will at launch. Design previews (?design=) still reach their
  // admin check below.
  const csDesign = request.nextUrl.searchParams.get("design");
  if (PRELAUNCH_HOME && path === "/coming-soon" && !csDesign) {
    const res = NextResponse.redirect(new URL("/", request.url), 308);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // Coming-soon design previews (lib/siteConfig.ts COMING_SOON_DESIGN): a
  // signed-in admin sees a design at /coming-soon?design=v2 or ?design=v3
  // (the V3 pack of 4 Oct 2026, preview only) while everyone else keeps
  // the current one. The internal preview addresses are admin-only too.
  // Never cached, never indexed.
  const csPreview =
    path === "/coming-soon/v2-preview" || path === "/coming-soon/v3-preview"
      ? path
      : path === "/coming-soon" && (csDesign === "v2" || csDesign === "v3")
        ? `/coming-soon/${csDesign}-preview`
        : null;
  if (csPreview) {
    const admin = await hasValidAdminSignature(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (path === "/coming-soon" && !admin) return; // the normal page
    const res = admin
      ? NextResponse.rewrite(new URL(csPreview, request.url))
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

  // With live deals before launch (DEALS_OPEN) the deal, business and
  // /auckland pages are public too.
  if (!SITE_LAUNCHED && ((path === "/" && !PRELAUNCH_HOME) || (!DEALS_OPEN && PRELAUNCH_PRIVATE.test(path)))) {
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
    // With the public prelaunch homepage, the private pages send people to
    // it instead.
    const res = NextResponse.redirect(new URL(PRELAUNCH_HOME ? "/" : "/coming-soon", request.url), path === "/" ? 308 : 307);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}

/** API routes whose answers are personal or signed-in only. */
const PRIVATE_API = /^\/api\/(?:admin|auth|merchants|deals\/(?!track(?:\/|$))[^/]+|upload-photo|platform-settings)(?:\/|$)/;

/** The customer-facing routes that stay admin-only until launch. */
const PRELAUNCH_PRIVATE = /^\/(?:auckland|deal|business)(?:\/|$)/;

export const config = {
  // Unchanged: static/generated utility routes and every API route never
  // need this middleware to run at all — skipping it keeps Google's
  // sitemap crawler (and everything else hitting those paths) off this
  // function's critical path entirely, which matters even more now that
  // this function is meant to be the fast, boring case for everyone else.
  // API requests too, but only for the switch-over pause: the first lines
  // of middleware() send them straight on otherwise.
  matcher: [
    "/api/:path*",
    "/((?!(?:.*/)?(?:favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|opengraph-image|(?:apple-)?icon(?:\\.png)?|security\\.txt)(?:/.*)?$)(?!_next/static|_next/image|.well-known|api/).*)",
  ],
};
