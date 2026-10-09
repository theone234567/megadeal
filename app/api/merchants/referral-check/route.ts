import { NextRequest, NextResponse } from "next/server";
import { createDataClient } from "@/lib/dataClient";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isReferralCodeFormat } from "@/lib/referral";

/**
 * Whether a referral code belongs to a business, for the sign-up form to
 * say so while it's being filled in (the bonus itself is only granted when
 * the new business is approved: /api/admin/merchants/[id]).
 *
 * Answers yes or no and nothing else, never whose code it is. Codes are
 * "MD" and six random hex characters (16.7 million of them) and each
 * address gets 30 checks an hour, so guessing a real one this way isn't
 * practical.
 */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  const answer = (valid: boolean) => NextResponse.json({ valid }, { headers: { "Cache-Control": "no-store" } });
  if (!isReferralCodeFormat(code)) return answer(false);

  if ((await checkRateLimit(`referral-check:${getClientIp(req)}`, 30, 60 * 60)).limited) {
    return NextResponse.json({ error: "Too many checks. Please try again later." }, { status: 429 });
  }
  try {
    const found = await createDataClient().items.query("Merchants").eq("referralCode", code).limit(1).find();
    return answer((found.items ?? []).length > 0);
  } catch (err) {
    console.error("[referral-check] lookup failed", err);
    return NextResponse.json({ error: "Couldn't check that code just now." }, { status: 500 });
  }
}
