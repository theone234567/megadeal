import { createClient, OAuthStrategy } from "@wix/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { SITE_LAUNCHED } from "@/lib/siteConfig";

const WIX_CLIENT_ID =
  process.env.NEXT_PUBLIC_WIX_CLIENT_ID || "a5df1008-85ea-4479-8a49-8b0576ae9714";

export async function middleware(request: NextRequest) {
  if (!SITE_LAUNCHED && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/coming-soon", request.url));
  }

  if (!request.cookies.get("session")) {
    const response = NextResponse.next();
    const wixClient = createClient({
      auth: OAuthStrategy({ clientId: WIX_CLIENT_ID }),
    });
    // generateVisitorTokens is a live call to Wix's (documented elsewhere
    // in this codebase as flaky) visitor OAuth endpoint. Every first-time
    // visitor with no session cookie yet — someone opening the site fresh
    // from a Google search result, or following an email confirmation
    // link's redirect — used to sit on a blank/loading screen for however
    // long that call took, however long that was. This cookie only
    // pre-seeds a convenience for WixProvider/lib/memberAuth.ts; the
    // client-side Wix SDK (lib/wixClient.ts) generates its own visitor
    // tokens on demand if none exist, so it's safe to give up after a
    // short timeout and let the page render without one rather than block
    // first paint on a possibly-slow external API.
    try {
      const tokens = await Promise.race([
        wixClient.auth.generateVisitorTokens(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1200)),
      ]);
      response.cookies.set("session", JSON.stringify(tokens), {
        path: "/",
        sameSite: "lax",
      });
    } catch {
      // Slow or failed — skip pre-seeding the cookie this once rather than
      // hold up the page; the next request without one just retries.
    }
    return response;
  }
}

export const config = {
  // Only real pages need a visitor session cookie (WixProvider's client-side
  // reads it, and lib/memberAuth.ts re-derives the signed-in merchant from
  // it on API routes) — by the time any fetch() call hits /api/*, the
  // cookie's already set from loading the page itself. Static/generated
  // utility routes (sitemap, robots, manifest, icons, and every API route)
  // never need this middleware to run at all, and skipping it removes a
  // live Wix API round-trip from their critical path — including, notably,
  // Google's sitemap crawler, which has little patience for that extra
  // network hop on what should be a trivial static file. The first
  // alternation catches opengraph-image/icon routes wherever they're
  // nested (e.g. app/list-your-business/opengraph-image.tsx serving
  // /list-your-business/opengraph-image, not just the root /opengraph-image) —
  // Next.js lets any route segment override these with its own file, and
  // each one still deserves the same bypass a social-media link scraper
  // benefits from.
  matcher: [
    "/((?!(?:.*/)?(?:favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|opengraph-image|icon|security\\.txt)(?:/.*)?$)(?!_next/static|_next/image|.well-known|api/).*)",
  ],
};
