/**
 * Build-safe brand font configuration.
 *
 * `next/font/google` downloads font files while webpack is compiling. That
 * made otherwise-valid production builds fail in restricted CI environments.
 * These stable class names and variables use rounded, widely available local
 * fallbacks instead, so rendering never waits on a third-party font host.
 */
export const fredoka = {
  className: "font-fredoka-local",
  variable: "font-fredoka-variable",
} as const;

export const plusJakartaSans = {
  className: "font-jakarta-local",
  variable: "font-jakarta-variable",
} as const;

export const caveat = {
  className: "font-caveat-local",
  variable: "font-caveat-variable",
} as const;
