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
    const tokens = await wixClient.auth.generateVisitorTokens();
    response.cookies.set("session", JSON.stringify(tokens), {
      path: "/",
      sameSite: "lax",
    });
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
  // nested (e.g. app/businesses/opengraph-image.tsx serving
  // /businesses/opengraph-image, not just the root /opengraph-image) —
  // Next.js lets any route segment override these with its own file, and
  // each one still deserves the same bypass a social-media link scraper
  // benefits from.
  matcher: [
    "/((?!(?:.*/)?(?:favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|opengraph-image|icon|security\\.txt)(?:/.*)?$)(?!_next/static|_next/image|.well-known|api/).*)",
  ],
};
