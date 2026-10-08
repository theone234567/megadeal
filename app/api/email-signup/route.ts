import { NextRequest, NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { insertEmailSignup, type EmailAudience } from "@/lib/emailSignups";
import { SITE_URL } from "@/lib/siteConfig";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { brandedEmailHtml } from "@/lib/emailTemplate";
import { publicFormCheckOn, verifyTurnstile } from "@/lib/turnstile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_AUDIENCES: EmailAudience[] = ["customer", "merchant"];

/**
 * Deal-alert email signup — double opt-in, stored in the email_signups
 * table (see lib/emailSignups.ts). A row is created
 * immediately with verified: false; only clicking the confirm link in the
 * email (verify/route.ts) flips it to true, so nobody's counted as
 * subscribed without proving they control the inbox.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 300) : "";
  const audience: EmailAudience = ALLOWED_AUDIENCES.includes(body.audience) ? body.audience : "customer";
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

  // Unauthenticated by nature (that's the point — anyone can sign up), but
  // that also means anyone can POST any email address and trigger a real
  // send to it with no proof they control that inbox. Two limits, both
  // needed: per-IP stops a single bot looping this endpoint; per-email
  // stops the same victim being bombed via many different/rotating IPs.
  //
  // The robot check (once its keys are set, lib/turnstile.ts) between the
  // two: after the per-IP limit, so a bot can't make us check thousands of
  // tokens; before the per-email one, so junk sent for someone's address
  // can't use up their three tries.
  const ip = getClientIp(req);
  const tooMany = () =>
    NextResponse.json({ error: "Too many signup attempts. Please try again later." }, { status: 429 });
  if ((await checkRateLimit(`emailsignup-ip:${ip}`, 5, 60 * 60)).limited) return tooMany();
  if (publicFormCheckOn() && !(await verifyTurnstile(body.captchaToken, ip))) {
    return NextResponse.json({ error: "The security check didn't pass. Please try again." }, { status: 400 });
  }
  if ((await checkRateLimit(`emailsignup-email:${email}`, 3, 24 * 60 * 60)).limited) return tooMany();

  const tokens = await insertEmailSignup({ email, audience, source, verified: false });
  if (!tokens) {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  // Already confirmed and still on the list: there is nothing to confirm,
  // so sending another "confirm your email" would be asking them to redo
  // something they've already done. The response is the same either way —
  // whether an address is subscribed isn't something this endpoint should
  // tell whoever typed it in.
  if (tokens.alreadySubscribed) {
    return NextResponse.json({ ok: true });
  }

  try {
    const confirmUrl = `${SITE_URL}/api/email-signup/verify?token=${tokens.verifyToken}`;
    const unsubscribeUrl = `${SITE_URL}/api/email-signup/unsubscribe?token=${tokens.unsubscribeToken}`;
    const sent = await sendTransactionalEmail({
      to: email,
      subject: "Confirm your MegaDeal email alerts 🐘",
      unsubscribeUrl,
      html:
        brandedEmailHtml(`
            <h1 style="margin:0 0 12px;font-size:20px;color:#211033;">One click and you're in 🎉</h1>
            <p style="margin:0 0 20px;">
              Thanks for signing up for MegaDeal deal alerts — NZ's best local
              deals, sniffed out for you. Just confirm this is your email
              address and we'll take it from there.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${confirmUrl}" style="display:inline-block;background:#6520B5;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:9999px;">
                Confirm my email
              </a>
            </div>
            <p style="margin:0;font-size:13px;color:#8b8494;">
              Didn't sign up for this? No action needed — you won't be added
              to the list unless you click the button above.
            </p>
        `) +
        `<p style="margin:16px 0 0;text-align:center;font-size:12px;color:#a39cae;">
          <a href="${unsubscribeUrl}" style="color:#a39cae;">Unsubscribe</a>
        </p>`,
    });
    if (!sent) {
      return NextResponse.json(
        { error: "Something went wrong sending your confirmation email. Please try again." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[email-signup] failed", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
