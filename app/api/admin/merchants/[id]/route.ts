import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";

const ALLOWED_STATUSES = ["Pending", "Approved", "Suspended"];

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

  const updated = await adminClient.items.update("Merchants", {
    ...existing,
    ...patch,
  });
  return NextResponse.json({ item: updated });
}
