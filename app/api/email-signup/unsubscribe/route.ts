import { NextRequest, NextResponse } from "next/server";
import { unsubscribeEmailSignupByToken } from "@/lib/emailSignups";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Unsubscribing, in two ways, both public on purpose. The token (random,
 * looked up by exact match, see lib/emailSignups.ts) is what proves the
 * caller received an email addressed to that sign-up.
 *
 * The link in an email (GET) doesn't unsubscribe by itself: link scanners
 * (workplace mail security, previews) open every link in a message, and
 * used to unsubscribe people who never clicked. It keeps the token in a
 * short-lived private cookie and shows /unsubscribe, where a person
 * presses the button (POST). The token is never in that page's address,
 * so analytics never see it.
 *
 * A mail app's own "Unsubscribe" button (the List-Unsubscribe header) is
 * a POST with the token in the address (RFC 8058 one-click), and does
 * unsubscribe straight away, as Gmail and Yahoo require.
 */

const COOKIE = "unsubscribe_token";
const TOKEN_RE = /^[0-9a-f]{64}$/;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!TOKEN_RE.test(token)) return NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=0`, 303);
  const res = NextResponse.redirect(`${SITE_URL}/unsubscribe`, 303);
  res.cookies.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/email-signup", maxAge: 60 * 60 });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function POST(req: NextRequest) {
  const oneClick = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (oneClick) {
    // A mail app: no page to show, just the answer.
    const ok = TOKEN_RE.test(oneClick) && (await unsubscribeEmailSignupByToken(oneClick));
    return new NextResponse(ok ? "Unsubscribed." : "That link isn't valid.", { status: ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  }
  // The button on /unsubscribe. The cookie only comes with a POST from
  // this site (SameSite=Lax), so another site can't press it for anyone.
  const token = req.cookies.get(COOKIE)?.value ?? "";
  const ok = TOKEN_RE.test(token) && (await unsubscribeEmailSignupByToken(token));
  const res = NextResponse.redirect(`${SITE_URL}/unsubscribed?ok=${ok ? 1 : 0}`, 303);
  res.cookies.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/api/email-signup", maxAge: 0 });
  return res;
}
