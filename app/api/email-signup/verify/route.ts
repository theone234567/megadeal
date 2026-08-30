import { NextRequest, NextResponse } from "next/server";
import { verifySignupConfirmToken } from "@/lib/emailSignupToken";
import { addResendContact } from "@/lib/resendAudience";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated on purpose — possessing a valid signed token
 * proves the clicker received the confirmation email. Only on a valid
 * token does the contact actually get added to Resend's Audience.
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (email && verifySignupConfirmToken(email, token)) {
    const added = await addResendContact(email);
    if (added) {
      return NextResponse.redirect(`${SITE_URL}/subscribed?ok=1`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/subscribed?ok=0`);
}
