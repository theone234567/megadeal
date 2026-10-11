/**
 * Pages that carry, or lead to, a secret (a password-reset link, a sign-in
 * callback) or are private (admin). No analytics, advertising or
 * attribution script runs on them (components/Trackers.tsx), so nothing a
 * third party loads can read their address.
 */
export function isTrackingFreePath(pathname: string | null | undefined): boolean {
  return /^\/(?:reset-password|login-callback|admin)(?:\/|$)/.test(pathname ?? "");
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
