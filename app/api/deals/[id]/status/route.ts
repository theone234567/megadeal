import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { allowedDealActions, hasDealExpired, withdrawalRefundsCredit } from "@/lib/dealStatus";
import { getOrClaimMerchant } from "@/lib/merchant";
import { incrementCreditsAtomically } from "@/lib/creditsAtomic";
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

    const allowed = allowedDealActions(deal.status ?? "Live").some((a) => a.target === target);
    if (!allowed) {
      return NextResponse.json({ error: "That status change isn't allowed." }, { status: 400 });
    }

    // Pausing never stops this deal's clock — expiresAt is an absolute
    // deadline set once at submission, and nothing here extends it. That's
    // fine while there's time left, but resuming a deal whose deadline has
    // already passed would flip it back to "Live" while isDealLive keeps
    // it off the storefront anyway — a merchant clicking "Make live" and
    // getting nothing, with no explanation. Caught here instead.
    if (target === "Live" && hasDealExpired(deal.expiresAt)) {
      return NextResponse.json(
        {
          error:
            "This deal's run already ended, so it can't be made live again. Duplicate it from the portal to relist with a fresh run.",
        },
        { status: 409 }
      );
    }

    // "Make live" normally resumes a paused deal whose clock is already
    // running (no change). If a deal was paused before it ever went live,
    // this is its first publication and starts its run — without it, the
    // deal would go live with no end date at all.
    const publication = target === "Live" ? firstPublicationFields(deal) : { fields: {} };
    if (publication.error) {
      return NextResponse.json({ error: publication.error }, { status: 409 });
    }

    const refund = target === "Cancelled" && withdrawalRefundsCredit(deal);
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
    // flag above is written first, so a retry can never refund twice.
    if (refund) {
      const merchant = await getOrClaimMerchant(adminClient, member);
      const refunded = merchant ? await incrementCreditsAtomically(adminClient, merchant._id, 1) : false;
      if (refunded) {
        await logMerchantActivity(adminClient, {
          merchantEmail: deal.merchantEmail,
          type: "credit",
          amount: 1,
          description: `Credit returned: "${deal.dealName || "Your deal"}" was withdrawn before going live`,
        });
      } else {
        console.error(`[deals/[id]/status] CREDIT NOT REFUNDED for withdrawn deal ${deal._id}`);
      }
    }
    return NextResponse.json({ item: updated, creditRefunded: refund });
  } catch (err) {
    console.error("[deals/[id]/status] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
