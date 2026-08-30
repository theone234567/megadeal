import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { addResendContact } from "@/lib/resendAudience";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated on purpose — possessing the token proves the
 * clicker received the confirmation email. Reachable only via that email.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (token) {
    const adminClient = createWixAdminClient();
    const result = await adminClient.items.query("EmailSignups").eq("verifyToken", token).find();
    const signup = result.items?.[0];
    if (signup) {
      await adminClient.items.update("EmailSignups", {
        ...signup,
        verified: true,
        verifyToken: "",
      });
      if (signup.audience === "customer") {
        await addResendContact(signup.email);
      }
      return NextResponse.redirect(`${SITE_URL}/subscribed?ok=1`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/subscribed?ok=0`);
}
