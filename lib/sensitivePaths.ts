/**
 * Pages that carry, or lead to, a secret (a password-reset link, a sign-in
 * callback, a signed "unsubscribe from business emails" link) or are
 * private (admin). No analytics, advertising or
 * attribution script runs on them (components/Trackers.tsx), so nothing a
 * third party loads can read their address.
 */
export function isTrackingFreePath(pathname: string | null | undefined): boolean {
  return /^\/(?:reset-password|login-callback|stop-emails|admin)(?:\/|$)/.test(pathname ?? "");
}

/** Pages the Meta (Facebook) Pixel stays off, though Google Analytics
 *  still runs: the business portal. Ads are aimed at people who haven't
 *  signed up yet, so the pixel learns nothing useful there, and a signed-in
 *  business's pages are nobody else's business. A new sign-up still
 *  reaches Meta from the server (Conversions API, app/api/merchants/apply). */
export function isPixelFreePath(pathname: string | null | undefined): boolean {
  return isTrackingFreePath(pathname) || /^\/portal(?:\/|$)/.test(pathname ?? "");
}

/** The password-reset link's token, moved out of the address into this
 *  HttpOnly cookie by middleware.ts before the page loads. */
export const RESET_COOKIE = "md_reset";

/** What a real reset token looks like (32 random bytes as hex,
 *  lib/passwordResetTokens.ts), so anything else is turned away cheaply. */
export const RESET_TOKEN_RE = /^[a-f0-9]{64}$/;

/** A URL with its query and fragment removed, for logging: those can
 *  carry tokens or whatever a visitor typed. Not a URL: kept short. */
export function urlWithoutQuery(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.split(/[?#]/)[0];
}
