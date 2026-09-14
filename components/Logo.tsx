/**
 * Clean transparent MegaDeal lockup for the site header.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex select-none items-center gap-[0.62em] font-display leading-none ${className}`}>
      <LogoElephant />
      <span className="inline-flex items-baseline font-extrabold tracking-[-0.05em]">
        <span className="text-[#2f1666]">Mega</span>
        <span className="ml-[0.035em] text-[#9b63e8]">Deal</span>
      </span>
    </span>
  );
}

function LogoElephant() {
  return (
    <svg viewBox="0 0 116 100" aria-hidden="true" focusable="false" className="block h-[1.34em] w-[1.56em] shrink-0 overflow-visible">
      <ellipse cx="26" cy="43" rx="18" ry="21" fill="#7a35d8" />
      <ellipse cx="79" cy="43" rx="18" ry="21" fill="#7a35d8" />
      <ellipse cx="26" cy="44" rx="10" ry="13" fill="#f2a1d8" opacity="0.62" />
      <ellipse cx="79" cy="44" rx="10" ry="13" fill="#f2a1d8" opacity="0.62" />
      <ellipse cx="53" cy="47" rx="30" ry="28" fill="#a27aeb" />
      <ellipse cx="49" cy="39" rx="20" ry="15" fill="#c3a8f4" opacity="0.28" />
      <path d="M56 60 C 63 69, 71 74, 80 69 C 89 64, 88 54, 92 46 C 95 40, 101 37, 106 40" fill="none" stroke="#a27aeb" strokeWidth="12" strokeLinecap="round" />
      <ellipse cx="42" cy="43" rx="8.5" ry="9.5" fill="#fff" />
      <ellipse cx="63" cy="43" rx="8.5" ry="9.5" fill="#fff" />
      <circle cx="44" cy="45" r="4.7" fill="#2f1666" />
      <circle cx="65" cy="45" r="4.7" fill="#2f1666" />
      <circle cx="45.6" cy="42.8" r="1.7" fill="#fff" />
      <circle cx="66.6" cy="42.8" r="1.7" fill="#fff" />
      <path d="M41 60 C 47 65, 55 66, 62 61" fill="none" stroke="#54209b" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="42" y="70" width="22" height="18" rx="8" fill="#5d16c7" />
      <path d="M47 82 V75 L53 80 L59 75 V82" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
