import { NextRequest, NextResponse } from "next/server";
import { createWixClient } from "@/lib/wixClient";
import { MEMBER_COOKIE_NAME, parseTokens } from "@/lib/memberSession";

export const dynamic = "force-dynamic";

/**
 * Ends the session: clears the httpOnly cookie and returns the Wix logout
 * URL for the page to follow, so the member is signed out of Wix too and
 * not just of this site.
 *
 * Building that URL needs the member's tokens, which the browser can no
 * longer read — so it happens here. The cookie is cleared whatever Wix
 * says: if that call fails, the right outcome is still that this site
 * forgets them, and the caller falls back to a plain redirect.
 */
export async function POST(req: NextRequest) {
  const tokens = parseTokens(req.cookies.get(MEMBER_COOKIE_NAME)?.value);
  const body = await req.json().catch(() => null);
  const returnTo = typeof body?.returnTo === "string" ? body.returnTo : undefined;

  let logoutUrl: string | null = null;
  if (tokens) {
    try {
      const client = createWixClient(tokens);
      const result = await client.auth.logout(returnTo || "/");
      logoutUrl = result?.logoutUrl ?? null;
    } catch (err) {
      console.error("[auth/logout] Wix logout failed", err);
    }
  }

  const res = NextResponse.json({ logoutUrl });
  res.cookies.delete(MEMBER_COOKIE_NAME);
  return res;
}
