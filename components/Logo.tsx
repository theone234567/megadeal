/**
 * The MegaDeal logo: deal-hunter elephant + "Mega" + the pink Deal tag.
 *
 * Replaces two different treatments that had drifted apart — an <img> to
 * /brand/megadeal-logo-deal-hunter.svg on the landing pages, and a
 * hand-assembled text wordmark plus the interactive ElephantMascot
 * everywhere else — with one component, so the mark is identical on
 * every page.
 *
 * Two things were broken in the SVG file it replaces:
 *
 *  - Its elephant was pulled in with <image href="/brand/…svg">. An SVG
 *    rendered through <img> is a sandboxed document that never loads
 *    external references, so the elephant silently never drew. The logo
 *    had been shipping as a wordmark with an empty space where the
 *    mascot should be.
 *  - Its text was set in "Arial Rounded MT Bold", which exists on macOS
 *    and almost nowhere else, so the wordmark reshaped itself per
 *    platform.
 *
 * Building it in markup fixes both: the elephant is inline and always
 * paints, and the type uses the real brand face through `font-display`
 * (Fredoka, see tailwind.config.ts) rather than hoping for a system
 * font. Everything is sized in `em`, so the whole lockup scales from the
 * one font-size set by the caller.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex select-none items-center gap-[0.2em] font-display leading-none ${className}`}
    >
      <LogoElephant />
      <span className="font-bold tracking-[-0.03em] text-[#5d16c7]">Mega</span>
      <span
        className="relative inline-flex items-center bg-[#e81ea3] pl-[0.3em] pr-[0.62em] font-bold tracking-[-0.02em] text-white"
        style={{
          borderRadius: "0.26em",
          clipPath:
            "polygon(0 0, calc(100% - 0.34em) 0, 100% 50%, calc(100% - 0.34em) 100%, 0 100%)",
          paddingTop: "0.1em",
          paddingBottom: "0.14em",
        }}
      >
        Deal
        {/* the punch-hole every price tag has */}
        <span
          aria-hidden
          className="absolute right-[0.42em] top-1/2 block -translate-y-1/2 rounded-full bg-white/90"
          style={{ width: "0.1em", height: "0.1em" }}
        />
      </span>
    </span>
  );
}

/**
 * Deliberately simple: this is read at around 40px tall in the header, so
 * it is built from a few large rounded shapes and oversized eyes rather
 * than the detail the full-size mascot art carries.
 */
function LogoElephant() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className="block h-[1.22em] w-[1.22em] shrink-0 overflow-visible"
    >
      {/* ears */}
      <ellipse cx="20" cy="43" rx="17" ry="21" fill="#7a17f0" />
      <ellipse cx="80" cy="43" rx="17" ry="21" fill="#7a17f0" />
      <ellipse cx="21" cy="44" rx="9" ry="12" fill="#f49ad6" opacity="0.55" />
      <ellipse cx="79" cy="44" rx="9" ry="12" fill="#f49ad6" opacity="0.55" />

      {/* head */}
      <ellipse cx="50" cy="46" rx="30" ry="28" fill="#8b32ff" />

      {/* trunk, curling up at the tip */}
      <path
        d="M50 64 C 50 78, 45 86, 51 92 C 56 97, 64 94, 65 87"
        fill="none"
        stroke="#8b32ff"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* eyes */}
      <circle cx="39" cy="43" r="8.5" fill="#ffffff" />
      <circle cx="61" cy="43" r="8.5" fill="#ffffff" />
      <circle cx="40.5" cy="44.5" r="4.6" fill="#2a0663" />
      <circle cx="62.5" cy="44.5" r="4.6" fill="#2a0663" />
      <circle cx="42.2" cy="42.6" r="1.7" fill="#ffffff" />
      <circle cx="64.2" cy="42.6" r="1.7" fill="#ffffff" />

      {/* cheeks */}
      <ellipse cx="30" cy="58" rx="6" ry="4" fill="#ff6cc0" opacity="0.5" />
      <ellipse cx="70" cy="58" rx="6" ry="4" fill="#ff6cc0" opacity="0.5" />
    </svg>
  );
}
