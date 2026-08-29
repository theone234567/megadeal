import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { SITE_URL } from "@/lib/siteConfig";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_AUDIENCES = ["customer", "merchant"];

/**
 * Deal-alert email signup — goes through this server route (rather than a
 * direct client-side Wix Data insert) so we can generate verification and
 * unsubscribe tokens and send the confirmation email server-side.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 300) : "";
  const audience = ALLOWED_AUDIENCES.includes(body.audience) ? body.audience : "customer";
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 100) : "unknown";
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

  const adminClient = createWixAdminClient();
  const verifyToken = randomBytes(32).toString("hex");
  const unsubscribeToken = randomBytes(32).toString("hex");

  await adminClient.items.insert("EmailSignups", {
    email,
    audience,
    source,
    verified: false,
    verifyToken,
    unsubscribed: false,
    unsubscribeToken,
  });

  try {
    const verifyUrl = `${SITE_URL}/api/email-signup/verify?token=${verifyToken}`;
    const unsubscribeUrl = `${SITE_URL}/api/email-signup/unsubscribe?token=${unsubscribeToken}`;
    await sendTransactionalEmail({
      to: email,
      subject: "Confirm your MegaDeal email alerts",
      html: `
        <p>Hi there,</p>
        <p>Thanks for signing up for MegaDeal deal alerts. Please confirm this is your email address:</p>
        <p><a href="${verifyUrl}">Confirm my email</a></p>
        <p>If you didn't sign up, you can ignore this email — you won't be added to the list unless you confirm.</p>
        <p style="margin-top:24px;font-size:12px;color:#888;">
          You're receiving this because you signed up for MegaDeal deal alerts.
          <a href="${unsubscribeUrl}">Unsubscribe</a> at any time.
        </p>
      `,
    });
  } catch (err) {
    console.error("[email-signup] verification email failed", err);
  }

  return NextResponse.json({ ok: true });
}
