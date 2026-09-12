import { Caveat, Fredoka, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Self-hosted via next/font (downloaded once at build time, served from
 * this domain, font-display: swap) rather than a runtime Google Fonts
 * request — no extra round-trip and no CLS risk beyond the brief swap
 * from the system-font fallback.
 */
export const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});
