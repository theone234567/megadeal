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
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jakarta",
});

export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-caveat",
});
