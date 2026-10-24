import { NextRequest, NextResponse } from "next/server";
import { auditTarget, logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { createDataClient } from "@/lib/dataClient";
import { notifyBusinessChanged } from "@/lib/indexNowDeal";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { PROFILE_FIELD_LABELS, REVIEWED_PROFILE_FIELDS, type ReviewedField } from "@/lib/profileReview";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { brandedEmailHtml } from "@/lib/emailTemplate";
import { escapeHtml } from "@/lib/escapeHtml";
import { greetingHtml } from "@/lib/emailGreeting";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * Admin > a business > "Profile changes waiting" (security pack T161):
 * { decision: "approve" } puts the held changes live; { decision:
 * "decline", note } drops them and tells the business why (the note is
 * required, as the business reads it). Either way nothing is waiting after.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== "approve" && decision !== "decline") return NextResponse.json({ error: "Approve or decline." }, { status: 400 });
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (decision === "decline" && note.length < 5) {
    return NextResponse.json({ error: "Say what the business should change. They'll see it." }, { status: 400 });
  }

  try {
    const adminClient = createDataClient();
    const merchant = await adminClient.items.get("Merchants", params.id);
    if (!merchant) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    const pending = merchant.pendingProfile && typeof merchant.pendingProfile === "object" ? merchant.pendingProfile : null;
    if (!pending) return NextResponse.json({ error: "There are no changes waiting." }, { status: 409 });
    const fields = (Object.keys(pending) as ReviewedField[]).filter((f) => (REVIEWED_PROFILE_FIELDS as readonly string[]).includes(f));
    const applied = decision === "approve" ? Object.fromEntries(fields.map((f) => [f, pending[f]])) : {};
    const updated = await adminClient.items.update("Merchants", {
      ...merchant,
      ...applied,
      pendingProfile: null,
      pendingProfileReview: null,
      pendingProfileAt: null,
    });
    const labels = fields.map((f) => PROFILE_FIELD_LABELS[f].toLowerCase()).join(", ");
    if (decision === "approve") notifyBusinessChanged(updated);
    if (merchant.email) {
      await logMerchantActivity(adminClient, {
        merchantEmail: merchant.email,
        type: "deal",
        description:
          decision === "approve"
            ? `Your changes (${labels}) are now on your business page`
            : `Your changes (${labels}) weren't approved: ${note}`,
      }).catch(() => {});
      if (decision === "decline") {
        await sendTransactionalEmail({
          to: merchant.email,
          subject: "A change to your MegaDeal business page needs another look",
          html: brandedEmailHtml(`
            ${greetingHtml(merchant.contactName, merchant.businessName)}
            <p style="margin:0 0 16px;">We couldn't put your latest change (${escapeHtml(labels)}) on your business page, so customers still see the previous version.</p>
            <p style="margin:0 0 16px;padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">${escapeHtml(note)}</p>
            <p style="margin:0 0 16px;"><a href="${SITE_URL}/portal/profile" style="color:#6D28D9;font-weight:700;">Update your business page</a></p>
            <p style="margin:0;font-size:13px;color:#8b8494;">Questions? Just reply to this email.</p>
          `),
          replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
        }).catch(() => false);
      }
    }
    await logAdminAction({
      action: decision === "approve" ? "Approved profile changes" : "Declined profile changes",
      target: auditTarget(merchant.businessName, merchant._id),
      detail: decision === "decline" ? `${labels}: ${note}` : labels,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/merchants/[id]/profile-changes] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
