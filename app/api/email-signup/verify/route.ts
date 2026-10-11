import { NextRequest, NextResponse } from "next/server";
import { verifyEmailSignupByToken } from "@/lib/emailSignups";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Confirming a deal-alert sign-up, public on purpose: the token (random,
 * looked up by exact match, see lib/emailSignups.ts) proves the person
 * received the confirmation email.
 *
 * As with unsubscribing (../unsubscribe/route.ts), opening the link (GET)
 * doesn't confirm anything by itself: mail scanners open every link in a
 * message, and would sign people up who never clicked (security audit of
 * 10 Oct 2026, finding 7). The token goes into a short-lived private
 * cookie and the browser is sent to /confirm-subscription, where a person
 * presses the button (POST). The token is never in that page's address.
 */

const COOKIE = "subscribe_token";
const TOKEN_RE = /^[0-9a-f]{64}$/;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!TOKEN_RE.test(token)) return NextResponse.redirect(`${SITE_URL}/subscribed?ok=0`, 303);
  const res = NextResponse.redirect(`${SITE_URL}/confirm-subscription`, 303);
  res.cookies.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/email-signup", maxAge: 60 * 60 });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

/** The button on /confirm-subscription. The cookie only comes with a POST
 *  from this site (SameSite=Lax), so another site can't press it. */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value ?? "";
  const ok = TOKEN_RE.test(token) && (await verifyEmailSignupByToken(token));
  const res = NextResponse.redirect(`${SITE_URL}/subscribed?ok=${ok ? 1 : 0}`, 303);
  res.cookies.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/api/email-signup", maxAge: 0 });
  return res;
}
