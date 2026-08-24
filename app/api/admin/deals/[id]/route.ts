import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";

const ALLOWED_STATUSES = ["Pending Approval", "Live", "Paused", "Cancelled"];

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
  if (body.expiresAt !== undefined) {
    if (body.expiresAt !== null && Number.isNaN(Date.parse(body.expiresAt))) {
      return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
    }
    patch.expiresAt = body.expiresAt;
  }
  if (body.merchantEmail !== undefined) {
    patch.merchantEmail = String(body.merchantEmail);
  }
  if (body.photoUrl !== undefined) {
    patch.photoUrl = String(body.photoUrl);
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const adminClient = createWixAdminClient();
  const existing = await adminClient.items.get("Deals", params.id);
  if (!existing) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }

  const updated = await adminClient.items.update("Deals", {
    ...existing,
    ...patch,
  });
  return NextResponse.json({ item: updated });
}
