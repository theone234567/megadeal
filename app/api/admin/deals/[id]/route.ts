import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { submitUrlsToIndexNow } from "@/lib/indexNow";
import { SITE_URL, SITE_LAUNCHED } from "@/lib/siteConfig";
import { unwrapProduct } from "@/lib/mapDeal";
import { PRODUCT_FIELDS, buildProductUpdate, parseAdminContentEdit, withHistory } from "@/lib/dealAdminEdit";

const ALLOWED_STATUSES = ["Pending Approval", "Live", "Paused", "Cancelled"];

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isAdminRequest(req))) {
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
  const photoDecision = body.photoDecision;
  if (photoDecision !== undefined && photoDecision !== "approve" && photoDecision !== "reject") {
    return NextResponse.json({ error: "Invalid photo decision." }, { status: 400 });
  }

  try {
    const adminClient = createWixAdminClient();
    const existing = await adminClient.items.get("Deals", params.id);
    if (!existing) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    // Content edits (name, description, price, conditions, booking,
    // quantity). Businesses can't make these once a deal is submitted.
    const { changes, error } = parseAdminContentEdit(body, existing);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    const changedFields = Object.keys(changes);
    Object.assign(patch, changes);

    // A business's replacement photo for a live deal waits here until an
    // admin approves it; the current photo stays up meanwhile.
    if (photoDecision) {
      if (!existing.pendingPhotoUrl) {
        return NextResponse.json({ error: "There's no new photo waiting." }, { status: 409 });
      }
      if (photoDecision === "approve") {
        patch.photoUrl = existing.pendingPhotoUrl;
        changedFields.push("photoUrl");
      }
      patch.pendingPhotoUrl = null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    if (changedFields.length > 0) {
      patch.contentHistory = withHistory(existing, changedFields);
    }

    // The storefront reads the name and prices from the Wix Stores product,
    // so those are written there first. If Wix refuses, nothing is saved
    // and the two copies can't drift apart.
    if (existing.productId && changedFields.some((f) => (PRODUCT_FIELDS as string[]).includes(f))) {
      const productError = await syncProduct(adminClient, existing, changes, patch);
      if (productError) {
        return NextResponse.json({ error: productError }, { status: 502 });
      }
    }

    // A deal that has been live can never earn a withdrawal refund, even
    // if it's later moved back to "Pending Approval".
    if (patch.status === "Live") patch.everLive = true;

    const updated = await adminClient.items.update("Deals", {
      ...existing,
      ...patch,
    });

    if (photoDecision && existing.merchantEmail) {
      await logMerchantActivity(adminClient, {
        merchantEmail: existing.merchantEmail,
        type: "deal",
        description:
          photoDecision === "approve"
            ? `New photo for "${existing.dealName || "your deal"}" approved and now showing`
            : `New photo for "${existing.dealName || "your deal"}" wasn't approved${
                body.photoNote ? `: ${String(body.photoNote).trim().slice(0, 300)}` : ""
              }`,
      });
    }

    const dealName = existing.dealName || "Your deal";
    const statusChanged = patch.status !== undefined && patch.status !== existing.status;
    // Only once launched: before that, deal pages are admin-only previews
    // (see middleware.ts), and pinging Bing would just send it to crawl a
    // test deal that redirects to /coming-soon.
    if (statusChanged && patch.status === "Live" && SITE_LAUNCHED) {
      // Fire-and-forget: nudge Bing/Yandex to crawl this deal right away
      // instead of waiting on their own discovery schedule. Never blocks
      // the response — a failed push just falls back to normal sitemap
      // discovery, same as before IndexNow existed.
      const urls = [`${SITE_URL}/`, `${SITE_URL}/list-your-business`];
      if (existing.productId) {
        adminClient.productsV3
          .getProduct(existing.productId, {} as any)
          .then((res: any) => {
            const slug = unwrapProduct(res)?.slug;
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
          description: SITE_LAUNCHED
            ? `"${dealName}" is now live`
            : `"${dealName}" is approved — customers will see it from launch day`,
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

async function syncProduct(
  adminClient: any,
  existing: Record<string, any>,
  changes: Record<string, unknown>,
  patch: Record<string, any>
): Promise<string | null> {
  try {
    const getRes = await adminClient.fetchWithAuth(
      `https://www.wixapis.com/stores/v3/products/${existing.productId}`,
      { method: "GET" }
    );
    if (!getRes.ok) {
      console.error("[admin/deals/[id]] product read failed", getRes.status, await getRes.text().catch(() => ""));
      return "Couldn't read this deal's Wix product, so nothing was changed. Try again.";
    }
    const { product } = await getRes.json();
    const priceNow = Number(patch.priceNow ?? existing.priceNow);
    const priceWas = Number(patch.priceWas ?? existing.priceWas ?? priceNow);
    const body = buildProductUpdate(product, changes, { priceNow, priceWas });
    if (!body) return null;
    const res = await adminClient.fetchWithAuth(
      `https://www.wixapis.com/stores/v3/products/${existing.productId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      console.error("[admin/deals/[id]] product update failed", res.status, await res.text().catch(() => ""));
      return "Wix didn't accept the change to this deal's product, so nothing was changed.";
    }
    return null;
  } catch (err: any) {
    console.error("[admin/deals/[id]] product sync failed", err);
    return err?.message || "Couldn't update this deal's Wix product, so nothing was changed.";
  }
}
