import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";

export const dynamic = "force-dynamic";

/**
 * The signed-in merchant's own deals.
 *
 * The portal used to run this query straight from the browser with the
 * member's tokens, which is the other reason those tokens had to be
 * script-readable. Scoping happens here now, against the email Wix
 * verified for the caller rather than anything the request supplied.
 */
export async function GET(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    const adminClient = createWixAdminClient();
    const result = await adminClient.items
      .query("Deals")
      .eq("merchantEmail", member.email.toLowerCase())
      .find();
    return NextResponse.json({ items: result.items ?? [] });
  } catch (err) {
    console.error("[deals/mine] failed", err);
    return NextResponse.json({ error: "Couldn't load your deals." }, { status: 500 });
  }
}
