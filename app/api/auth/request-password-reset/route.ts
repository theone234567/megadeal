import { NextRequest, NextResponse } from "next/server";
import { createDataClient } from "@/lib/dataClient";
import { queryAllByEmail } from "@/lib/queryAll";
import { createPasswordResetToken } from "@/lib/passwordResetTokens";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { brandedEmailHtml } from "@/lib/emailTemplate";
import { escapeHtml } from "@/lib/escapeHtml";
import { SITE_URL } from "@/lib/siteConfig";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { afterResponse } from "@/lib/afterResponse";
import { readJsonBody } from "@/lib/readJsonBody";
import { verifyTurnstile } from "@/lib/turnstile";
import { accountIdForEmail } from "@/lib/authSession";
import { noteSignupCodeProblem, noteSignupCodeSent } from "@/lib/signupHealth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The found/not-found paths below cost very different amounts of real
// work (a database lookup either way, but only the found path also sends
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
      <a href="${resetUrl}" style="display:inline-block;background:#6D28D9;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;">Reset password</a>
    </p>
    <p style="margin:0 0 16px;">This link works once and expires in an hour. If you didn't ask for this, you can safely ignore it — your password hasn't changed.</p>
  `);
}

/**
 * Public, unauthenticated by design — this is what "Forgot password"
 * calls (lib/passwordResetTokens.ts). Always answers the same way regardless of
 * whether the email matches a real account, so a visitor can't use it to
 * find out which email addresses have signed up.
 */
export async function POST(req: NextRequest) {
  const body = await readJsonBody(req, 4096);
  if (body === "too_large") return NextResponse.json({ error: "That request was too large." }, { status: 413 });
  const fields = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const email = typeof fields.email === "string" ? fields.email.trim().slice(0, 254) : "";
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  // The robot check, as on sign-in (security audit of 10 Oct 2026,
  // finding 6): otherwise a script could send reset emails to address
  // after address. Before the per-address limit, so junk requests can't
  // use up a real business's resets.
  if (!(await verifyTurnstile(fields.captchaToken, getClientIp(req)))) {
    return NextResponse.json({ error: "The security check didn't pass. Please try again." }, { status: 400 });
  }

  // Keyed on the email itself, not the caller's IP — a shared office or
  // café network sharing one address shouldn't get one business's request
  // limit spent by another's.
  const { limited } = await checkRateLimit(`pwreset-request:${email.toLowerCase()}`, 5, 60 * 60, { failClosed: true });
  // And a generous cap per visitor, so one source can't send reset emails
  // to address after address.
  const { limited: busy } = await checkRateLimit(`pwreset-request-ip:${getClientIp(req)}`, 30, 60 * 60, { failClosed: true });
  if (limited || busy) {
    // Same response as success — the limit itself isn't something to reveal.
    return NextResponse.json({ ok: true });
  }

  // Looked up and sent after the answer has gone (lib/afterResponse.ts),
  // so the reply takes the same time whether or not the address has an
  // account: the timing can't tell anyone which addresses have signed up.
  const startedAt = Date.now();
  afterResponse(async () => {
    try {
      const adminClient = createDataClient();
      const rows = await queryAllByEmail(
        (e) => adminClient.items.query("Merchants").eq("email", e),
        email,
        "password-reset-lookup"
      );
      const merchant = rows[0];
      // Any business on file qualifies: one brought over from Wix has no
      // login yet (Wix passwords couldn't be moved), and this link is how
      // it sets one. The link proves the address before anything is set.
      // An account that hasn't finished its business application yet (so
      // has no business on file) can reset its password too.
      const to = merchant?.email || ((await accountIdForEmail(email)) ? email.toLowerCase() : "");
      if (to) {
        const token = await createPasswordResetToken(to);
        if (token) {
          const resetUrl = `${SITE_URL}/reset-password?token=${token}`;
          const sent = await sendTransactionalEmail({
            to,
            subject: "Reset your MegaDeal password",
            html: resetEmailHtml(merchant?.businessName ?? "", resetUrl),
          });
          // The answer stays the same either way (it never says whether an
          // account exists), but a failed send is logged.
          if (!sent) {
            console.error("[auth/request-password-reset] email not sent");
            // Nobody would know otherwise: Needs attention, and an email.
            await noteSignupCodeProblem("email_not_sent", "password reset");
          } else {
            await noteSignupCodeSent();
          }
        }
      }
    } catch (err) {
      console.error("[auth/request-password-reset] failed", err);
      // Fall through to the same generic response either way.
    }
  });

  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_RESPONSE_MS) await sleep(MIN_RESPONSE_MS - elapsed);

  return NextResponse.json({ ok: true });
}
