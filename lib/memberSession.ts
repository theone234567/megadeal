import type { Tokens } from "@wix/sdk";

/**
 * Where a signed-in merchant's Wix member tokens live.
 *
 * Deliberately NOT the "session" cookie, which middleware seeds with
 * visitor tokens and the browser SDK reads directly. That cookie cannot be
 * httpOnly — client-side Wix calls need to read it — and it used to hold
 * member tokens too once someone signed in. That made any XSS on the site
 * a full account takeover: injected script reads document.cookie, walks
 * off with a refresh token, and has the merchant's account for as long as
 * that token lives, from anywhere, with no further access to the page.
 *
 * Visitor tokens are worth little (they reach the same public catalogue
 * anyone can browse), so they stay readable. Member tokens are worth a
 * great deal, so they live here instead: httpOnly, written only by
 * /api/auth/session, and read only by server code. Script on the page can
 * still act as the member while the page is open — that is inherent to
 * XSS — but it can no longer take the credential away with it.
 */
export const MEMBER_COOKIE_NAME = "member_session";

/**
 * No maxAge: this stays a session cookie, matching the behaviour it
 * replaces (js-cookie without an expiry), so closing the browser still
 * ends the session rather than silently extending it to the refresh
 * token's full life.
 */
export const MEMBER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function serializeTokens(tokens: Tokens): string {
  return JSON.stringify(tokens);
}

export function parseTokens(raw: string | undefined | null): Tokens | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Tokens) : null;
  } catch {
    return null;
  }
}
