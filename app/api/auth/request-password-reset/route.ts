import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { queryAllByEmail } from "@/lib/queryAll";
import { createPasswordResetToken } from "@/lib/passwordResetTokens";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { brandedEmailHtml } from "@/lib/emailTemplate";
import { escapeHtml } from "@/lib/escapeHtml";
import { SITE_URL } from "@/lib/siteConfig";
import { checkRateLimit } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The found/not-found paths below cost very different amounts of real
// work (a Wix Data query either way, but only the found path also sends
// an email) — left alone, that's a timing side-channel an attacker could
// use to find out which emails have accounts even though the response
// body never says. Flooring every request to the same minimum wall-clock
// time closes that without slowing down the common case much.
const MIN_RESPONSE_MS = 600;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resetEmailHtml(businessName: string, resetUrl: string): string {
  const safeName = escapeHtml(businessName || "there");
  return brandedEmailHtml(`
    <p style="margin:0 0 16px;">Hi ${safeName},</p>
    <p style="margin:0 0 16px;">We got a request to reset the password on your MegaDeal business account. Tap below to set a new one:</p>
    <p style="margin:0 0 16px;text-align:center;">
      <a href="${resetUrl}" style="display:inline-block;background:#7a17f0;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Reset password</a>
    </p>
    <p style="margin:0 0 16px;">This link works once and expires in an hour. If you didn't ask for this, you can safely ignore it — your password hasn't changed.</p>
  `);
}

/**
 * Public, unauthenticated by design — this is what "Forgot password"
 * actually calls now (see lib/passwordResetTokens.ts for why Wix's own
 * flow doesn't work here). Always answers the same way regardless of
 * whether the email matches a real account, so a visitor can't use it to
 * find out which email addresses have signed up.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Keyed on the email itself, not the caller's IP — a shared office or
  // café network sharing one address shouldn't get one business's request
  // limit spent by another's.
  const { limited } = await checkRateLimit(`pwreset-request:${email.toLowerCase()}`, 5, 60 * 60);
  if (limited) {
    // Same response as success — the limit itself isn't something to reveal.
    return NextResponse.json({ ok: true });
  }

  const startedAt = Date.now();
  try {
    const adminClient = createWixAdminClient();
    const rows = await queryAllByEmail(
      (e) => adminClient.items.query("Merchants").eq("email", e),
      email,
      "password-reset-lookup"
    );
    const merchant = rows[0];
    // _owner is a Wix Data system field: it's only set once a real Wix
    // Member has actually signed in and claimed this row (getOrClaimMerchant).
    // Without it, this is an "Unclaimed account" (same flag the admin
    // dashboard shows) — there's no member to reset a password for yet,
    // and setMemberPassword's Sign On step would silently create one if
    // we called it anyway. Treated the same as "email not found."
    if (merchant?.email && merchant._owner) {
      const token = await createPasswordResetToken(merchant.email);
      if (token) {
        const resetUrl = `${SITE_URL}/reset-password?token=${token}`;
        await sendTransactionalEmail({
          to: merchant.email,
          subject: "Reset your MegaDeal password",
          html: resetEmailHtml(merchant.businessName, resetUrl),
        });
      }
    }
  } catch (err) {
    console.error("[auth/request-password-reset] failed", err);
    // Fall through to the same generic response either way.
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_RESPONSE_MS) await sleep(MIN_RESPONSE_MS - elapsed);

  return NextResponse.json({ ok: true });
}
