import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";

export const dynamic = "force-dynamic";

/**
 * One of the caller's own deals, for the "Duplicate this deal" prefill.
 *
 * The new-deal form used to fetch this from the browser and then check
 * ownership in the page — which decided what to *show*, not what to
 * release: the record had already been handed to the client by then. The
 * check is server-side now, so a deal belonging to someone else is never
 * sent at all.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    const adminClient = createWixAdminClient();
    const deal = await adminClient.items.get("Deals", params.id);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }
    if ((deal.merchantEmail || "").toLowerCase() !== member.email.toLowerCase()) {
      return NextResponse.json({ error: "This isn't your deal." }, { status: 403 });
    }
    return NextResponse.json({ item: deal });
  } catch (err) {
    console.error("[deals/[id]] GET failed", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
