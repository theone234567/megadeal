import { NextRequest, NextResponse } from "next/server";
import { auditTarget, logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { createDataClient } from "@/lib/dataClient";
import { createPasswordResetToken } from "@/lib/passwordResetTokens";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { brandedEmailHtml } from "@/lib/emailTemplate";
import { escapeHtml } from "@/lib/escapeHtml";
import { greetingName } from "@/lib/emailGreeting";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * Admin > a business > Account access (T248): a link for the business to
 * set its own password, never a password the admin sees. Body { send:
 * "email" } emails it to the business (as "Forgot password" would); { send:
 * "link" } returns it for the admin to pass on, for a business that can't
 * reach its inbox. Either way the link works once, for 24 hours, and
 * nothing changes until the business uses it (app/api/auth/confirm-
 * password-reset, which also signs out every session).
 */
const LINK_HOURS = 24;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const send = body?.send === "email" ? "email" : body?.send === "link" ? "link" : null;
  if (!send) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    const adminClient = createDataClient();
    const merchant = await adminClient.items.get("Merchants", params.id);
    if (!merchant) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    const email = String(merchant.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "This business has no account email on file." }, { status: 400 });
    }
    const token = await createPasswordResetToken(email, LINK_HOURS * 60 * 60);
    if (!token) return NextResponse.json({ error: "Couldn't make a link just now. Please try again." }, { status: 503 });
    const link = `${SITE_URL}/reset-password?token=${token}`;
    const target = auditTarget(merchant.businessName || email, merchant._id);

    if (send === "email") {
      const name = escapeHtml(greetingName(merchant.contactName, merchant.businessName));
      const sent = await sendTransactionalEmail({
        to: email,
        subject: "Set a new password for MegaDeal",
        html: brandedEmailHtml(`
          <p style="margin:0 0 16px;">Hi ${name},</p>
          <p style="margin:0 0 16px;">MegaDeal sent you this link to set a new password for your business account:</p>
          <p style="margin:0 0 16px;text-align:center;">
            <a href="${link}" style="display:inline-block;background:#6D28D9;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Set a new password</a>
          </p>
          <p style="margin:0 0 16px;">It works once and expires in ${LINK_HOURS} hours. Your current password keeps working until you set a new one. If you didn't ask for this, you can ignore this email, or reply to let us know.</p>
        `),
        replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
      }).catch(() => false);
      if (!sent) return NextResponse.json({ error: `The email to ${email} didn't send. Try again, or get a link to pass on.` }, { status: 502 });
      await logAdminAction({ action: "Password reset link emailed", target });
      return NextResponse.json({ ok: true, emailedTo: email });
    }
    // The link itself is never logged.
    await logAdminAction({ action: "Password reset link made to pass on", target });
    return NextResponse.json({ ok: true, link, hours: LINK_HOURS });
  } catch (err) {
    // Never the provider's own text (security review finding 2).
    console.error("[admin/merchants/[id]/reset-password] failed", err);
    return NextResponse.json({ error: "Couldn't make a link. Please try again." }, { status: 500 });
  }
}
