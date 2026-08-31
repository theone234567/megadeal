import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated on purpose — possessing the random token proves
 * the clicker received the verification email, which is the whole point.
 * Reachable only via the link sent to the applicant's own inbox.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  try {
    if (token) {
      const adminClient = createWixAdminClient();
      const result = await adminClient.items.query("Merchants").eq("emailVerifyToken", token).find();
      const merchant = result.items?.[0];
      if (merchant) {
        await adminClient.items.update("Merchants", {
          ...merchant,
          emailVerified: true,
          emailVerifyToken: "",
        });
        return NextResponse.redirect(`${SITE_URL}/businesses/verified?ok=1`);
      }
    }
  } catch (err) {
    console.error("[merchants/verify-email] failed", err);
  }

  return NextResponse.redirect(`${SITE_URL}/businesses/verified?ok=0`);
}
