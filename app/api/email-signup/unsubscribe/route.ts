import { NextRequest, NextResponse } from "next/server";
import { unsubscribeEmailSignupByToken } from "@/lib/emailSignups";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated on purpose — this is the unsubscribe link that
 * goes in every email. Unlike the verify token, this one is never cleared,
 * so the same link in an old email always still works. The token itself
 * (random, looked up by exact match — see lib/emailSignups.ts) is what
 * proves the caller actually received an email addressed to this row;
 * there's no separate ?email= param to guess or enumerate.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (token) {
    const ok = await unsubscribeEmailSignupByToken(token);
    if (ok) {
      return NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=1`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=0`);
}
