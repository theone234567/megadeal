import { NextRequest, NextResponse } from "next/server";
import { optOutBusiness, validBusinessOptOut } from "@/lib/businessEmailOptOut";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * "Stop MegaDeal business emails" (lib/businessEmailOptOut.ts).
 *
 * The button on /stop-emails posts here (a form, then back to that page).
 * A mail app's own "Unsubscribe" button (the List-Unsubscribe header,
 * RFC 8058 one-click) posts here with the link's details in the address
 * and gets a plain answer. Either way the link's signature is what proves
 * it came from an email MegaDeal sent; nothing else is accepted.
 */
export async function POST(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.has("m")) {
    const ok = validBusinessOptOut(q.get("m"), q.get("s")) && (await optOutBusiness(q.get("m")!));
    return new NextResponse(ok ? "Unsubscribed." : "That link isn't valid.", { status: ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  }
  // The form has two short fields; anything bigger isn't from it.
  if (Number(req.headers.get("content-length") ?? 0) > 4096) return NextResponse.redirect(`${SITE_URL}/stop-emails?done=0`, 303);
  const form = await req.formData().catch(() => null);
  const m = form?.get("m");
  const ok = validBusinessOptOut(m, form?.get("s")) && (await optOutBusiness(m));
  return NextResponse.redirect(`${SITE_URL}/stop-emails?done=${ok ? 1 : 0}`, 303);
}
