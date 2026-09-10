import { NextRequest, NextResponse } from "next/server";
import { verifyEmailSignupByToken } from "@/lib/emailSignups";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated on purpose — possessing the token proves the
 * clicker received the confirmation email (see lib/emailSignups.ts).
 * Reachable only via that email; the token is single-use.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (token) {
    const ok = await verifyEmailSignupByToken(token);
    if (ok) {
      return NextResponse.redirect(`${SITE_URL}/subscribed?ok=1`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/subscribed?ok=0`);
}
