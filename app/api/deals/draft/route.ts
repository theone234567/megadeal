import { NextRequest, NextResponse } from "next/server";
import { codeForDraft } from "@/lib/dealCode";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createDataClient } from "@/lib/dataClient";
import { isWixMediaUrl } from "@/lib/photoUrl";
import { sanitizeDraft, draftToRow, draftRevisionOf, isDraftConflict } from "@/lib/dealDraft";
import { getOrClaimMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

/** Enough drafts for any real merchant, few enough that a loop can't fill
 *  the collection. Hit only by something automated. */
const MAX_DRAFTS = 25;

/**
 * Saves a deal the merchant is still working on.
 *
 * Creates a Deals row with status "Draft" and no productId, or updates one
 * they already own. No credit is spent — a draft is not a submission, and
 * charging for one would make merchants avoid saving their work, which is
 * the opposite of the point.
 *
 * Validation is deliberately light here; see lib/dealDraft.ts. The strict
 * checks belong at submission, in /api/deals/create.
 */
export async function POST(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (await memberRateLimited("deal-draft", member.id, 60, HOUR)) {
    return NextResponse.json(
      { error: "That's a lot of saving at once — give it a moment and try again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const draft = sanitizeDraft(body.draft);
  // A photo URL is the one field here that gets written somewhere it will
  // later be rendered, so it has to be one of ours rather than any URL the
  // caller fancies pointing us at.
  if (draft.photoUrl && !isWixMediaUrl(draft.photoUrl)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  const draftId = typeof body.draftId === "string" ? body.draftId : null;

  try {
    const adminClient = createDataClient();

    // Same gate as /api/deals/create. Being a signed-in site member is not
    // the same as being a merchant: without this, anyone with an account
    // could write rows into the Deals collection, and a suspended business
    // could keep preparing listings it is not allowed to publish.
    const merchant = await getOrClaimMerchant(adminClient, member);
    if (!merchant) {
      return NextResponse.json(
        { error: "No business application found for this account." },
        { status: 404 }
      );
    }
    if (merchant.status === "Suspended") {
      return NextResponse.json(
        { error: "Your account is suspended. Contact us for help." },
        { status: 403 }
      );
    }

    const row = draftToRow(draft, member.email);

    if (draftId) {
      const existing = await adminClient.items.get("Deals", draftId);
      if (!existing) {
        return NextResponse.json({ error: "That draft no longer exists." }, { status: 404 });
      }
      if ((existing.merchantEmail || "").toLowerCase() !== member.email.toLowerCase()) {
        return NextResponse.json({ error: "This isn't your draft." }, { status: 403 });
      }
      // Only a draft may be rewritten this way. Without this, the route
      // would happily overwrite a Live deal's content — no approval, no
      // review — by passing its id as a draft id.
      if (existing.status !== "Draft") {
        return NextResponse.json(
          { error: "This deal has already been submitted and can't be edited as a draft." },
          { status: 409 }
        );
      }
      // Saved from another tab or device since this form loaded it.
      if (isDraftConflict(existing, body.baseRevision, body.force)) {
        return NextResponse.json(
          { error: "This draft was changed in another tab or on another device.", conflict: true },
          { status: 409 }
        );
      }
      const updated = await adminClient.items.update("Deals", {
        ...existing,
        ...row,
        dealCode: codeForDraft(draft.dealCode, existing.dealCode),
        draftRevision: draftRevisionOf(existing) + 1,
      });
      return NextResponse.json({ item: updated });
    }

    const mine = await adminClient.items
      .query("Deals")
      .eq("merchantEmail", member.email)
      .eq("status", "Draft")
      .find();
    if ((mine.items?.length ?? 0) >= MAX_DRAFTS) {
      return NextResponse.json(
        { error: `You can keep up to ${MAX_DRAFTS} drafts. Submit or delete one to save another.` },
        { status: 429 }
      );
    }

    // Every deal has its code from its first saved draft (lib/dealCode.ts).
    const created = await adminClient.items.insert("Deals", {
      ...row,
      dealCode: codeForDraft(draft.dealCode, null),
      draftRevision: 1,
    });
    return NextResponse.json({ item: created });
  } catch (err) {
    console.error("[deals/draft] failed", err);
    return NextResponse.json({ error: "Couldn't save your draft. Please try again." }, { status: 500 });
  }
}
