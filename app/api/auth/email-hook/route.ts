import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { brandedEmailHtml } from "@/lib/emailTemplate";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Supabase Auth's "send email" hook: Supabase asks us to send each login
 * email (the sign-up code, the password-reset code), and we send it from
 * MegaDeal, branded, through the same sending as every other email
 * (lib/sendEmail.ts). Set in Supabase: Authentication > Hooks > Send
 * Email, URL https://megadeal.co.nz/api/auth/email-hook, with its secret
 * as SEND_EMAIL_HOOK_SECRET ("v1,whsec_...").
 *
 * Only a request signed with that secret (Standard Webhooks) in the last
 * five minutes is acted on: nobody else can make the site send these.
 */

const TOLERANCE_SECONDS = 5 * 60;

function signatureValid(req: NextRequest, body: string): boolean {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET ?? "";
  const key = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
  const id = req.headers.get("webhook-id") ?? "";
  const timestamp = req.headers.get("webhook-timestamp") ?? "";
  const signatures = (req.headers.get("webhook-signature") ?? "").split(" ");
  if (!key || !id || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", Buffer.from(key, "base64")).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.some((s) => {
    const [version, value] = s.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

function codeEmail(heading: string, lead: string, code: string, footnote: string): string {
  return brandedEmailHtml(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#211033;">${heading}</h1>
    <p style="margin:0 0 20px;">${lead}</p>
    <p style="margin:0 0 20px;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#211033;">${code}</p>
    <p style="margin:0;font-size:13px;color:#8b8494;">${footnote}</p>
  `);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 20_000 || !signatureValid(req, body)) {
    return NextResponse.json({ error: { http_code: 401, message: "Invalid signature" } }, { status: 401 });
  }
  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: { http_code: 400, message: "Invalid body" } }, { status: 400 });
  }
  const email = String(payload?.user?.email ?? "");
  const action = String(payload?.email_data?.email_action_type ?? "");
  const code = String(payload?.email_data?.token ?? "");
  if (!email || !/^\d{6,10}$/.test(code)) {
    return NextResponse.json({ error: { http_code: 400, message: "Nothing to send" } }, { status: 400 });
  }
  // Supabase limits these too; this caps what any one address can get.
  if ((await checkRateLimit(`auth-email:${email.toLowerCase()}`, 10, 60 * 60)).limited) {
    return NextResponse.json({ error: { http_code: 429, message: "Too many emails to this address" } }, { status: 429 });
  }

  const expires = "It works once, for the next 10 minutes.";
  const notYou = "Didn't ask for this? You can ignore this email; nothing changes until the code is used.";
  const message =
    action === "recovery"
      ? { subject: `${code} is your MegaDeal password code`, html: codeEmail("Set your password", `Enter this code on MegaDeal to choose a new password. ${expires}`, code, notYou) }
      : action === "signup"
        ? { subject: `${code} is your MegaDeal sign-up code`, html: codeEmail("Confirm your email", `Enter this code on MegaDeal to finish creating your business account. ${expires}`, code, notYou) }
        : null;
  if (!message) {
    // Kinds of email MegaDeal doesn't use (magic links, invites, email
    // changes): refused,
    // so nothing goes out that the site never offers.
    return NextResponse.json({ error: { http_code: 400, message: `Unsupported email: ${action}` } }, { status: 400 });
  }
  const sent = await sendTransactionalEmail({ to: email, subject: message.subject, html: message.html });
  if (!sent) return NextResponse.json({ error: { http_code: 500, message: "Couldn't send" } }, { status: 500 });
  return NextResponse.json({});
}
