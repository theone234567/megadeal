/**
 * The MegaDeal logo lockup used where we need a clean transparent mark.
 * The mascot carries the personality; the wordmark stays broad enough to
 * cover restaurants, wellness, activities, getaways and local services
 * without tying the brand to shopping or a single deal category.
 *
 * Everything is sized in `em`, so callers control the complete lockup with
 * one responsive font-size class.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex select-none items-center gap-[0.48em] font-display leading-none ${className}`}
    >
      <LogoElephant />
      <span className="inline-flex items-baseline font-bold tracking-[-0.045em]">
        <span className="text-[#5d16c7]">Mega</span>
        <span className="ml-[0.04em] text-[#9b57ed]">Deal</span>
      </span>
    </span>
  );
}

/**
 * Compact mascot designed to remain readable at header size. The palette
 * mirrors the live site: strong MegaDeal purple, softer lavender, and pink
 * only as a small warmth/accent colour in the ears and cheeks.
 */
function LogoElephant() {
  return (
    <svg
      viewBox="0 0 112 100"
      aria-hidden="true"
      focusable="false"
      className="block h-[1.46em] w-[1.64em] shrink-0 overflow-visible drop-shadow-[0_0.08em_0.12em_rgba(64,18,133,0.16)]"
    >
      {/* ears */}
      <ellipse cx="24" cy="43" rx="19" ry="22" fill="#7a25df" />
      <ellipse cx="82" cy="43" rx="19" ry="22" fill="#7a25df" />
      <ellipse cx="24" cy="44" rx="11" ry="14" fill="#ef8bd0" opacity="0.72" />
      <ellipse cx="82" cy="44" rx="11" ry="14" fill="#ef8bd0" opacity="0.72" />

      {/* head */}
      <ellipse cx="53" cy="46" rx="31" ry="29" fill="#9a62ec" />
      <ellipse cx="50" cy="38" rx="21" ry="17" fill="#b895f4" opacity="0.38" />

      {/* trunk curling upward */}
      <path
        d="M55 60 C 61 70, 68 76, 78 72 C 88 68, 87 57, 91 48 C 94 41, 99 37, 104 39"
        fill="none"
        stroke="#9a62ec"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M101 39 C 105 38, 108 40, 108 44"
        fill="none"
        stroke="#9a62ec"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* eyes */}
      <ellipse cx="42" cy="43" rx="8.8" ry="10" fill="#ffffff" />
      <ellipse cx="63" cy="43" rx="8.8" ry="10" fill="#ffffff" />
      <circle cx="44" cy="45" r="4.9" fill="#2a0663" />
      <circle cx="65" cy="45" r="4.9" fill="#2a0663" />
      <circle cx="45.6" cy="42.8" r="1.8" fill="#ffffff" />
      <circle cx="66.6" cy="42.8" r="1.8" fill="#ffffff" />

      {/* friendly smile / cheeks */}
      <path d="M40 60 C 46 66, 55 67, 62 61" fill="none" stroke="#54209b" strokeWidth="3.6" strokeLinecap="round" />
      <ellipse cx="32" cy="58" rx="6.5" ry="4" fill="#f06abb" opacity="0.38" />
      <ellipse cx="70" cy="58" rx="6.5" ry="4" fill="#f06abb" opacity="0.38" />

      {/* small hoodie-style M badge cue */}
      <circle cx="52" cy="79" r="10" fill="#5d16c7" />
      <path d="M46.5 83 V75 L52 80 L57.5 75 V83" fill="none" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
