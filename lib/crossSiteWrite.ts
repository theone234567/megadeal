/**
 * True for a request that would change something (not GET/HEAD/OPTIONS)
 * sent by a browser from another website: a form or script on some other
 * site trying to act with a visitor's MegaDeal sign-in (cross-site request
 * forgery). Checked for every API route in middleware.ts, on top of the
 * SameSite cookies and the sign-in routes' own checks (security audit of
 * 10 Oct 2026, other hardening).
 *
 * Browsers say where a request came from (Origin, Sec-Fetch-Site).
 * Servers calling our webhooks send neither and are let through; they're
 * checked by their own signatures. A mail app's one-click unsubscribe is
 * also exempt: it's meant to work from anywhere, with its own token.
 */
const EXEMPT = new Set(["/api/email-signup/unsubscribe", "/api/auth/email-hook", "/api/csp-report"]);

export function isCrossSiteWrite(req: Request, canonicalHost: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  const url = new URL(req.url);
  if (EXEMPT.has(url.pathname)) return false;
  const origin = req.headers.get("origin");
  if (origin) {
    if (origin === "null") return true;
    let host: string;
    try {
      host = new URL(origin).host;
    } catch {
      return true;
    }
    return host !== url.host && host !== canonicalHost;
  }
  return req.headers.get("sec-fetch-site") === "cross-site";
}
