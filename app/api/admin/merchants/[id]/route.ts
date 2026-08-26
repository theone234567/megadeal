import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { SITE_URL } from "@/lib/siteConfig";

const ALLOWED_STATUSES = ["Pending", "Approved", "Suspended"];
const INTRO_CREDITS = 2;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const patch: Record<string, any> = {};
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.creditsBalance !== undefined) {
    const credits = Number(body.creditsBalance);
    if (!Number.isFinite(credits) || credits < 0) {
      return NextResponse.json({ error: "Invalid credits balance." }, { status: 400 });
    }
    patch.creditsBalance = credits;
  }
  if (body.rating !== undefined) {
    if (body.rating === null || body.rating === "") {
      patch.rating = null;
    } else {
      const rating = Number(body.rating);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        return NextResponse.json({ error: "Rating must be between 0 and 5." }, { status: 400 });
      }
      patch.rating = rating;
    }
  }
  if (body.reviewCount !== undefined) {
    if (body.reviewCount === null || body.reviewCount === "") {
      patch.reviewCount = null;
    } else {
      const reviewCount = Number(body.reviewCount);
      if (!Number.isFinite(reviewCount) || reviewCount < 0) {
        return NextResponse.json({ error: "Invalid review count." }, { status: 400 });
      }
      patch.reviewCount = reviewCount;
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const adminClient = createWixAdminClient();
  const existing = await adminClient.items.get("Merchants", params.id);
  if (!existing) {
    return NextResponse.json({ error: "Merchant not found." }, { status: 404 });
  }

  // First-time approval: grant a small number of free introductory credits
  // so a newly-approved merchant can submit a deal straight away, without
  // waiting on a manual top-up. Only kicks in when the admin didn't also
  // set an explicit credits number in this same save (respecting a
  // deliberate manual entry) and the merchant currently has none.
  const becomingApproved = patch.status === "Approved" && existing.status !== "Approved";
  const adminSetCredits = patch.creditsBalance !== undefined;
  if (becomingApproved && !adminSetCredits && (Number(existing.creditsBalance) || 0) === 0) {
    patch.creditsBalance = INTRO_CREDITS;
  }

  const updated = await adminClient.items.update("Merchants", {
    ...existing,
    ...patch,
  });

  if (becomingApproved && existing.email) {
    try {
      await sendTransactionalEmail({
        to: existing.email,
        subject: "You're approved! Welcome to MegaDeal",
        html: `
          <p>Hi ${existing.businessName || "there"},</p>
          <p>Good news — your business is approved on MegaDeal. Log in to your
          business portal to submit your first deal:</p>
          <p><a href="${SITE_URL}/portal">Go to your portal</a></p>
          ${
            patch.creditsBalance
              ? `<p>We've added ${patch.creditsBalance} free introductory deal credit${
                  patch.creditsBalance === 1 ? "" : "s"
                } to your account so you can get started right away.</p>`
              : ""
          }
        `,
      });
    } catch (err) {
      console.error("[admin/merchants] approval email failed", err);
    }
  }

  return NextResponse.json({ item: updated });
}
