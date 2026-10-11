import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createDataClient } from "@/lib/dataClient";
import { getOrClaimMerchant } from "@/lib/merchant";
import { queryAllByEmail } from "@/lib/queryAll";
import { insertEmailSignup } from "@/lib/emailSignups";
import { optedOutBusinesses, optInBusiness, optOutBusiness } from "@/lib/businessEmailOptOut";

export const dynamic = "force-dynamic";

/**
 * A signed-in business's own email choices (portal > Emails from MegaDeal):
 *  - news: the business news and tips list (EmailSignups, audience
 *    "merchant"), the same list the sign-up tick box joins;
 *  - announcements: announcements to businesses and "finish your listing"
 *    reminders (lib/businessEmailOptOut.ts, the same switch the emails'
 *    unsubscribe links turn off).
 * Emails about the account and deals aren't affected by either.
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

async function newsRows(client: ReturnType<typeof createDataClient>, email: string) {
  const rows = await queryAllByEmail((e) => client.items.query("EmailSignups").eq("email", e), email, "EmailSignups (preferences)");
  return rows.filter((r: any) => r.audience === "merchant");
}

async function current(client: ReturnType<typeof createDataClient>, merchant: { _id: string; email: string }) {
  const rows = await newsRows(client, merchant.email);
  const news = rows.some((r: any) => r.verified === true) && !rows.some((r: any) => r.unsubscribed === true);
  const announcements = !(await optedOutBusinesses([merchant._id])).has(merchant._id);
  return { news, announcements };
}

export async function GET(req: NextRequest) {
  const ctx = await load(req);
  if (!ctx.ok) return ctx.error;
  try {
    return NextResponse.json(await current(ctx.client, ctx.merchant), { headers });
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
  const body = (await req.json().catch(() => null)) as { news?: unknown; announcements?: unknown } | null;
  if (!body || (typeof body.news !== "boolean" && typeof body.announcements !== "boolean")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers });
  }
  try {
    const { client, merchant } = ctx;
    if (typeof body.news === "boolean") {
      if (body.news) {
        // Their own signed-in choice: confirmed straight away (their
        // address is the account's, already verified).
        const ok = await insertEmailSignup({ email: merchant.email, audience: "merchant", source: "portal", verified: true });
        if (!ok) throw new Error("couldn't subscribe");
        // An unsubscribe on any row counts for the whole address
        // (lib/announcement.ts), so every row is turned back on.
        for (const row of await newsRows(client, merchant.email)) {
          if (row.unsubscribed || row.verified !== true) {
            await client.items.update("EmailSignups", { ...row, unsubscribed: false, verified: true });
          }
        }
      } else {
        for (const row of await newsRows(client, merchant.email)) {
          if (!row.unsubscribed) await client.items.update("EmailSignups", { ...row, unsubscribed: true });
        }
      }
    }
    if (typeof body.announcements === "boolean") {
      const ok = body.announcements ? await optInBusiness(merchant._id) : await optOutBusiness(merchant._id);
      if (!ok) throw new Error("couldn't save the announcements choice");
    }
    return NextResponse.json(await current(client, merchant), { headers });
  } catch (err) {
    console.error("[merchants/email-preferences] save failed", err);
    return NextResponse.json({ error: "Couldn't save that. Please try again." }, { status: 500, headers });
  }
}
