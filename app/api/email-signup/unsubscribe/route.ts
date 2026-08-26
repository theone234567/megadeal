import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated on purpose — this is the unsubscribe link that
 * goes in every email. Unlike the verify token, this one is never cleared,
 * so the same link in an old email always still works.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (token) {
    const adminClient = createWixAdminClient();
    const result = await adminClient.items
      .query("EmailSignups")
      .eq("unsubscribeToken", token)
      .find();
    const signup = result.items?.[0];
    if (signup) {
      if (!signup.unsubscribed) {
        await adminClient.items.update("EmailSignups", { ...signup, unsubscribed: true });
      }
      return NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=1`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=0`);
}
