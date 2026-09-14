import { NextResponse, type NextRequest } from "next/server";
import { SITE_LAUNCHED } from "@/lib/siteConfig";

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
  if (!SITE_LAUNCHED && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/coming-soon", request.url));
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
