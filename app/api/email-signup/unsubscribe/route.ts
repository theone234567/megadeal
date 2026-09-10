import { NextRequest, NextResponse } from "next/server";
import { markResendContactUnsubscribed } from "@/lib/resendAudience";
import { verifyUnsubscribeToken } from "@/lib/emailSignupToken";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated by design (no session — this is a link clicked
 * from an email), but not unauthenticated as to *whose* subscription it
 * touches: without the signed token check below, anyone who knows or
 * guesses an email address could unsubscribe it with a bare GET and no
 * proof they received anything, silently opting a stranger out. The token
 * (lib/emailSignupToken.ts) proves this link actually came from an email
 * sent to this address.
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (email && verifyUnsubscribeToken(email, token)) {
    const ok = await markResendContactUnsubscribed(email);
    if (ok) {
      return NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=1`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=0`);
}
