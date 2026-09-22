import { NextResponse, type NextRequest } from "next/server";
import { SITE_LAUNCHED, SITE_URL } from "@/lib/siteConfig";

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
export function middleware(request: NextRequest) {
  if (!isCanonicalHost(request.nextUrl.hostname)) {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname + request.nextUrl.search, SITE_URL),
      308
    );
  }

  if (!SITE_LAUNCHED && request.nextUrl.pathname === "/") {
    // 308, not the 307 default: a temporary redirect tells search engines
    // "don't replace the indexed page, the real content is still here" —
    // but "/" itself has no content at all (middleware answers before any
    // HTML renders), so a temporary redirect leaves Google with nothing to
    // build a title/description from and it falls back to showing just the
    // bare site name in search results. 308 tells it to index /coming-soon
    // (which has the real title, description and content) in place of "/"
    // instead. Matches the canonical-host redirect immediately above.
    return NextResponse.redirect(new URL("/coming-soon", request.url), 308);
  }
}

export const config = {
  // Unchanged: static/generated utility routes and every API route never
  // need this middleware to run at all — skipping it keeps Google's
  // sitemap crawler (and everything else hitting those paths) off this
  // function's critical path entirely, which matters even more now that
  // this function is meant to be the fast, boring case for everyone else.
  matcher: [
    "/((?!(?:.*/)?(?:favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|opengraph-image|icon|security\\.txt)(?:/.*)?$)(?!_next/static|_next/image|.well-known|api/).*)",
  ],
};
