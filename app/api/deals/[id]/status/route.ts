import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { allowedDealActions, dealDisplayStatus, withdrawalRefundsCredit } from "@/lib/dealStatus";
import { getOrClaimMerchant } from "@/lib/merchant";
import { incrementCreditsAtomically, setFieldsIf } from "@/lib/creditsAtomic";
import { creditsToRefund } from "@/lib/platformSettingsRules";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { notifyDealChanged } from "@/lib/indexNowDeal";
import { firstPublicationFields } from "@/lib/dealDuration";
import type { DealStatus } from "@/lib/types";

/**
 * Merchant-facing status changes (pause/resume/cancel/withdraw) go through here
 * instead of a direct client write, so the allowed state-machine
 * transitions are enforced server-side — a merchant can never self-approve
 * a deal out of "Pending Approval" into "Live" no matter what request they
 * craft, because that transition is never in `allowedDealActions`.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (await memberRateLimited("deal-status", member.id, 60, HOUR)) {
    return NextResponse.json({ error: "That's a lot of changes at once — please try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const target = body?.status as DealStatus | undefined;
  if (!target) {
    return NextResponse.json({ error: "Missing target status." }, { status: 400 });
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

    // Checked before anything else, so every attempt on an ended deal gets
    // the same answer: its run is over, and the way to run it again is a
    // new deal with a new run length.
    if (dealDisplayStatus({ status: deal.status, expiresAt: deal.expiresAt }) === "Ended") {
      return NextResponse.json(
        {
          error:
            "This deal has ended, so it can't be paused, restarted or cancelled. Use \"Run this deal again\" in your portal to relist it with a new run length.",
        },
        { status: 409 }
      );
    }

    const allowed = allowedDealActions(deal.status ?? "Live").some((a) => a.target === target);
    if (!allowed) {
      return NextResponse.json({ error: "That status change isn't allowed." }, { status: 400 });
    }

    // "Make live" normally resumes a paused deal whose clock is already
    // running (no change). If a deal was paused before it ever went live,
    // this is its first publication and starts its run — without it, the
    // deal would go live with no end date at all.
    const publication = target === "Live" ? firstPublicationFields(deal) : { fields: {} };
    if (publication.error) {
      return NextResponse.json({ error: publication.error }, { status: 409 });
    }

    // What the deal was charged: 4 or 1 under the current costs, 0 if it
    // was submitted while charging was off, 1 for older deals.
    const refundAmount = creditsToRefund(deal);
    const refund = target === "Cancelled" && withdrawalRefundsCredit(deal) && refundAmount > 0;
    // Only one request may withdraw it: a double tap, a second tab or the
    // automatic check rejecting it at the same moment would otherwise each
    // see "Pending Approval" and each give the credits back.
    if (refund) {
      const claimed = await setFieldsIf(
        adminClient,
        "Deals",
        deal._id,
        { status: "Cancelled", creditRefunded: true },
        { status: { $eq: "Pending Approval" } }
      );
      if (!claimed) {
        const now = await adminClient.items.get("Deals", deal._id).catch(() => null);
        if (now?.status === "Pending Approval") {
          return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 503 });
        }
        // Someone else got there first: it's already withdrawn or decided.
        return NextResponse.json({ item: now ?? deal, creditRefunded: false, creditsRefunded: 0 });
      }
    }
    const updated = await adminClient.items.update("Deals", {
      ...deal,
      ...publication.fields,
      status: target,
      ...(target === "Live" ? { everLive: true } : {}),
      ...(refund ? { creditRefunded: true } : {}),
    });
    // Pausing, resuming or cancelling a public deal changes what search
    // engines should show.
    if (deal.status === "Live" || target === "Live") notifyDealChanged(adminClient, updated);

    // Withdrawing a deal that was never public gives its credit back —
    // deals can't be edited once submitted, so withdrawing and resubmitting
    // is how a business fixes a mistake, and it shouldn't cost them. The
    // claim above is made first, so only one request can ever refund it.
    if (refund) {
      const merchant = await getOrClaimMerchant(adminClient, member);
      const refunded = merchant ? await incrementCreditsAtomically(adminClient, merchant._id, refundAmount) : false;
      if (refunded) {
        await logMerchantActivity(adminClient, {
          merchantEmail: deal.merchantEmail,
          type: "credit",
          amount: refundAmount,
          description: `${refundAmount} credit${refundAmount === 1 ? "" : "s"} returned: "${deal.dealName || "Your deal"}" was withdrawn before going live`,
        });
      } else {
        console.error(`[deals/[id]/status] CREDITS NOT REFUNDED (${refundAmount}) for withdrawn deal ${deal._id}`);
      }
    }
    return NextResponse.json({ item: updated, creditRefunded: refund, creditsRefunded: refund ? refundAmount : 0 });
  } catch (err) {
    console.error("[deals/[id]/status] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
