import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { notifyDealChanged } from "@/lib/indexNowDeal";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import { isWixMediaUrl } from "@/lib/photoUrl";
import { firstPublicationFields, manualExpiryError } from "@/lib/dealDuration";
import { hasDealExpired } from "@/lib/dealStatus";
import { isScheduledFuture, parseScheduledStart } from "@/lib/dealSchedule";
import { PRODUCT_FIELDS, buildProductUpdate, parseAdminContentEdit, withHistory } from "@/lib/dealAdminEdit";
import { readRevision } from "@/lib/dealRevision";

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
  if (body.expiresAt !== undefined && body.expiresAt !== null && Number.isNaN(Date.parse(body.expiresAt))) {
    return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
  }
  if (body.merchantEmail !== undefined) {
    patch.merchantEmail = String(body.merchantEmail);
  }
  if (body.photoUrl !== undefined) {
    // Only a photo from our own uploader (Wix Media), never an arbitrary URL.
    if (!isWixMediaUrl(body.photoUrl)) {
      return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
    }
    patch.photoUrl = body.photoUrl;
  }
  if (body.note !== undefined) {
    patch.statusNote = String(body.note).trim().slice(0, 500) || null;
  }
  const revisionDecision = body.revisionDecision;
  if (revisionDecision !== undefined && revisionDecision !== "approve" && revisionDecision !== "decline") {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
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

    // End date typed in by an admin. Only a real change counts — the admin
    // form sends its date field back on every save, and re-saving it used
    // to reset a Flash Deal's end time to midnight. A change must stay in
    // the future and within the listing's maximum run (lib/dealDuration.ts);
    // an existing end date can't be removed.
    if (body.expiresAt !== undefined) {
      const current = existing.expiresAt ? new Date(existing.expiresAt).getTime() : null;
      const requested = body.expiresAt === null ? null : new Date(body.expiresAt).getTime();
      const unchanged =
        requested === current || (requested !== null && current !== null && Math.abs(requested - current) < 60_000);
      if (!unchanged) {
        if (requested === null) {
          return NextResponse.json({ error: "A deal needs an end date — it can't be removed." }, { status: 400 });
        }
        const expiryProblem = manualExpiryError(existing, new Date(requested).toISOString());
        if (expiryProblem) return NextResponse.json({ error: expiryProblem }, { status: 400 });
        patch.expiresAt = new Date(requested).toISOString();
      }
    }

    // A new start time (lib/dealSchedule.ts), or null to start on
    // approval instead: for a deal still waiting for approval (e.g. one
    // whose requested start passed before it was reviewed), or one that's
    // approved but hasn't started yet. Once a deal is showing, its start
    // is history.
    if (body.scheduledStart !== undefined) {
      const scheduledFuture = isScheduledFuture(existing);
      if ((existing.firstPublishedAt || existing.everLive) && !scheduledFuture) {
        return NextResponse.json({ error: "This deal has already started, so its start time can't change." }, { status: 409 });
      }
      // An approved deal keeps the run it was given, moved with its start.
      const run = scheduledFuture
        ? new Date(existing.expiresAt).getTime() - new Date(existing.firstPublishedAt).getTime()
        : NaN;
      if (body.scheduledStart === null) {
        patch.scheduledStartAt = null;
        if (scheduledFuture && Number.isFinite(run)) {
          const now = Date.now();
          patch.firstPublishedAt = new Date(now).toISOString();
          patch.expiresAt = new Date(now + run).toISOString();
        }
      } else {
        const start = parseScheduledStart(body.scheduledStart?.date, body.scheduledStart?.time, Date.now(), { admin: true });
        if (start.error !== undefined) return NextResponse.json({ error: start.error }, { status: 400 });
        patch.scheduledStartAt = start.iso;
        if (scheduledFuture && Number.isFinite(run)) {
          patch.firstPublishedAt = start.iso;
          patch.expiresAt = new Date(Date.parse(start.iso) + run).toISOString();
        }
      }
    }

    // A business's change request (lib/dealRevision.ts): approving applies
    // it exactly as an admin edit of the same fields would (checked again
    // against the deal as it is now, product kept in step, history kept);
    // declining just clears it. Either way it's no longer waiting.
    let contentBody: Record<string, unknown> = body;
    let revision: ReturnType<typeof readRevision> = null;
    if (revisionDecision) {
      revision = readRevision(existing);
      if (!revision) return NextResponse.json({ error: "There's no change request waiting." }, { status: 409 });
      patch.pendingRevision = null;
      if (revisionDecision === "approve") contentBody = { ...body, ...revision.changes };
    }

    // Content edits (name, description, price, conditions, booking,
    // quantity). Businesses can't make these once a deal is submitted.
    const { changes, error } = parseAdminContentEdit(contentBody, existing);
    if (error) {
      return NextResponse.json(
        { error: revisionDecision === "approve" ? `This change can't be applied as it stands: ${error} Decline it with a note instead.` : error },
        { status: 400 }
      );
    }
    const changedFields = Object.keys(changes);
    Object.assign(patch, changes);
    if (patch.photoUrl !== undefined && patch.photoUrl !== existing.photoUrl) {
      changedFields.push("photoUrl");
    }

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

    // Going live for the first time starts the listing's clock. An end
    // date set in this same save wins; otherwise it comes from the run the
    // business asked for. Idempotent — a deal that was live before keeps
    // its end date, so re-approving never restarts the countdown.
    if (patch.status === "Live" && existing.status !== "Live") {
      if (patch.expiresAt) {
        if (!existing.firstPublishedAt && !existing.everLive) patch.firstPublishedAt = new Date().toISOString();
      } else {
        // With any new start time from this same save (only that: the
        // rest of the patch already marks the deal as having been live).
        const publication = firstPublicationFields(
          patch.scheduledStartAt !== undefined ? { ...existing, scheduledStartAt: patch.scheduledStartAt } : existing
        );
        if (publication.error) return NextResponse.json({ error: publication.error }, { status: 409 });
        Object.assign(patch, publication.fields);
      }
    }

    // A deal whose run is over (paused past its end, say) can't be switched
    // back to Live on its old dates: it would read "Live" here and in the
    // business's portal while staying off the site. A new end date in the
    // same save is checked above (future, within the maximum run).
    if (patch.status === "Live" && existing.status !== "Live" && hasDealExpired(patch.expiresAt ?? existing.expiresAt)) {
      return NextResponse.json(
        {
          error:
            "This deal's run has ended. Set a new end date in the future in the same save, or ask the business to run it again as a new deal.",
        },
        { status: 409 }
      );
    }

    const updated = await adminClient.items.update("Deals", {
      ...existing,
      ...patch,
    });

    if (revisionDecision && existing.merchantEmail) {
      await logMerchantActivity(adminClient, {
        merchantEmail: existing.merchantEmail,
        type: "deal",
        description:
          revisionDecision === "approve"
            ? `Your change to "${existing.dealName || "your deal"}" was approved and is now showing`
            : `Your change to "${existing.dealName || "your deal"}" wasn't approved${
                body.revisionNote ? `: ${String(body.revisionNote).trim().slice(0, 300)}` : ""
              }`,
      });
    }

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
    // Tell Bing and the other IndexNow engines when a public deal
    // appears, disappears or changes. Does nothing before launch, when
    // deal pages are admin-only previews.
    const wasLive = existing.status === "Live";
    const isLive = updated.status === "Live";
    const touchedPublicPage =
      (statusChanged && (wasLive || isLive)) ||
      (isLive && (changedFields.length > 0 || patch.expiresAt !== undefined));
    if (touchedPublicPage) notifyDealChanged(adminClient, updated);
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
