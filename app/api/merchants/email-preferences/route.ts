import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createDataClient } from "@/lib/dataClient";
import { getOrClaimMerchant } from "@/lib/merchant";
import { businessEmailsOn, setBusinessEmails } from "@/lib/businessEmailChoices";

export const dynamic = "force-dynamic";

/**
 * A signed-in business's one email choice (portal > Emails from MegaDeal):
 * news and updates from MegaDeal, on or off (lib/businessEmailChoices.ts).
 * Emails about the account and deals aren't affected.
 */

const headers = { "Cache-Control": "private, no-store" };

async function load(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) return { ok: false as const, error: NextResponse.json({ error: "Please sign in." }, { status: 401, headers }) };
  const client = createDataClient();
  const merchant = await getOrClaimMerchant(client, member);
  if (!merchant?._id || !merchant.email) {
    return { ok: false as const, error: NextResponse.json({ error: "No business found for this account." }, { status: 404, headers }) };
  }
  return { ok: true as const, member, client, merchant: merchant as { _id: string; email: string } };
}

export async function GET(req: NextRequest) {
  const ctx = await load(req);
  if (!ctx.ok) return ctx.error;
  try {
    return NextResponse.json({ subscribed: await businessEmailsOn(ctx.client, ctx.merchant) }, { headers });
  } catch (err) {
    console.error("[merchants/email-preferences] read failed", err);
    return NextResponse.json({ error: "Couldn't load your email settings." }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest) {
  const ctx = await load(req);
  if (!ctx.ok) return ctx.error;
  if (await memberRateLimited("merchant-email-prefs", ctx.member.id, 30, HOUR)) {
    return NextResponse.json({ error: "That's a lot of changes at once. Please try again shortly." }, { status: 429, headers });
  }
  const body = (await req.json().catch(() => null)) as { subscribed?: unknown } | null;
  if (!body || typeof body.subscribed !== "boolean") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers });
  }
  try {
    if (!(await setBusinessEmails(ctx.client, ctx.merchant, body.subscribed))) throw new Error("couldn't save the choice");
    return NextResponse.json({ subscribed: await businessEmailsOn(ctx.client, ctx.merchant) }, { headers });
  } catch (err) {
    console.error("[merchants/email-preferences] save failed", err);
    return NextResponse.json({ error: "Couldn't save that. Please try again." }, { status: 500, headers });
  }
}
