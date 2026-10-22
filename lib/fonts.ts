import { Caveat, Fredoka, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Self-hosted via next/font (downloaded once at build time, served from
 * this domain, font-display: swap) rather than a runtime Google Fonts
 * request — no extra round-trip and no CLS risk beyond the brief swap
 * from the system-font fallback.
 *
 * Each exposes a CSS variable as well as a className. The variables are
 * attached once on <html> in app/layout.tsx and wired into Tailwind's
 * `font-sans` / `font-display` in tailwind.config.ts, so every page gets
 * the brand faces by inheritance. Before that, fonts were opted into per
 * section: pages that forgot (e.g. /terms) silently rendered in the
 * system sans, and `font-display` resolved to a platform stack that
 * differs on macOS, Windows and Android.
 */
export const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-fredoka",
  // Stand-ins sized to match, for computers with Arial and for Android
  // without it (app/globals.css), then any sans-serif, never the browser's
  // default serif. The first is Next's own Arial stand-in, which can't
  // be told about Roboto, so Next's is turned off.
  fallback: ["FredokaFallbackArial", "FredokaFallbackRoboto", "sans-serif"],
  adjustFontFallback: false,
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jakarta",
  fallback: ["JakartaFallbackArial", "JakartaFallbackRoboto", "sans-serif"],
  adjustFontFallback: false,
});

export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-caveat",
  // Not preloaded: it's the largest of the three fonts (about 74KB) and
  // is only used for the handwritten signature on /list-your-business.
  // Preloaded, every page downloaded it up front; now only that page does,
  // when it's actually drawn.
  preload: false,
});
