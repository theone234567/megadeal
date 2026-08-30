import { NextRequest, NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { addResendContact } from "@/lib/resendAudience";
import { SITE_URL } from "@/lib/siteConfig";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Deal-alert email signup. Resend's Audience is the sole storage for this
 * (no Wix Data involved) — a signup is just a contact in Resend, marked
 * unsubscribed:false. Single opt-in: added immediately, then sent a
 * welcome email with an unsubscribe link, rather than gated behind a
 * confirm-your-email click.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 300) : "";
  const consent = body.consent === true;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json(
      { error: "Please agree to receive deal emails to sign up." },
      { status: 400 }
    );
  }

  const added = await addResendContact(email);
  if (!added) {
    return NextResponse.json(
      { error: "Something went wrong saving your signup. Please try again." },
      { status: 500 }
    );
  }

  try {
    const unsubscribeUrl = `${SITE_URL}/api/email-signup/unsubscribe?email=${encodeURIComponent(email)}`;
    await sendTransactionalEmail({
      to: email,
      subject: "You're on the list for MegaDeal alerts!",
      html: `
        <p>Hi there,</p>
        <p>You're in — you'll now get MegaDeal's best deals straight to your inbox.</p>
        <p style="margin-top:24px;font-size:12px;color:#888;">
          You're receiving this because you signed up for MegaDeal deal alerts.
          <a href="${unsubscribeUrl}">Unsubscribe</a> at any time.
        </p>
      `,
    });
  } catch (err) {
    console.error("[email-signup] welcome email failed", err);
  }

  return NextResponse.json({ ok: true });
}
