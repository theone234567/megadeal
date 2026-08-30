import { NextRequest, NextResponse } from "next/server";
import { markResendContactUnsubscribed } from "@/lib/resendAudience";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated on purpose — this is the unsubscribe link that
 * goes in every email. Resend's Audience is the sole storage for
 * deal-alert signups, so this just marks the contact unsubscribed there.
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (email) {
    const ok = await markResendContactUnsubscribed(email);
    if (ok) {
      return NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=1`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=0`);
}
