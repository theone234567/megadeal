import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { submitUrlsToIndexNow } from "@/lib/indexNow";
import { SITE_URL } from "@/lib/siteConfig";

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
  if (body.note !== undefined) {
    patch.statusNote = String(body.note).trim().slice(0, 500) || null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const adminClient = createWixAdminClient();
    const existing = await adminClient.items.get("Deals", params.id);
    if (!existing) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    const updated = await adminClient.items.update("Deals", {
      ...existing,
      ...patch,
    });

    const dealName = existing.dealName || "Your deal";
    const statusChanged = patch.status !== undefined && patch.status !== existing.status;
    if (statusChanged && patch.status === "Live") {
      // Fire-and-forget: nudge Bing/Yandex to crawl this deal right away
      // instead of waiting on their own discovery schedule. Never blocks
      // the response — a failed push just falls back to normal sitemap
      // discovery, same as before IndexNow existed.
      const urls = [`${SITE_URL}/`, `${SITE_URL}/businesses`];
      if (existing.productId) {
        adminClient.productsV3
          .getProduct(existing.productId, {} as any)
          .then((res: any) => {
            const slug = res?.product?.slug;
            if (slug) urls.push(`${SITE_URL}/deal/${slug}`);
            return submitUrlsToIndexNow(urls);
          })
          .catch(() => submitUrlsToIndexNow(urls));
      } else {
        submitUrlsToIndexNow(urls);
      }
    }
    if (statusChanged && existing.merchantEmail) {
      if (patch.status === "Live") {
        await logMerchantActivity(adminClient, {
          merchantEmail: existing.merchantEmail,
          type: "deal",
          description: `"${dealName}" is now live`,
        });
      } else if (patch.status === "Paused" || patch.status === "Cancelled") {
        const note = patch.statusNote ?? existing.statusNote;
        await logMerchantActivity(adminClient, {
          merchantEmail: existing.merchantEmail,
          type: "deal",
          description: note
            ? `"${dealName}" was ${patch.status.toLowerCase()}: ${note}`
            : `"${dealName}" was ${patch.status.toLowerCase()}`,
        });
      }
    }

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[admin/deals/[id]] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
