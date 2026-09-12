/**
 * Illustrated Auckland skyline at dusk — Sky Tower, harbour and sailboats.
 *
 * There's no licensed photograph of Auckland in the repo and this
 * environment has no outbound access to stock-photo hosts to source or
 * verify one, so this is hand-authored vector art rather than a
 * placeholder. To swap in a real photo later, drop it in public/images/
 * and replace the usages in app/coming-soon/page.tsx with a plain <img>.
 *
 * The viewBox is deliberately WIDE (800x440). It used to be square
 * (400x400) while the frames that render it are 1.28:1 on desktop and
 * wider still on mobile — with preserveAspectRatio="slice" that cropped
 * the entire lower third away, taking the harbour and the boats' hulls
 * with it. What survived was a row of plain rectangles floating on a
 * gradient, which read as a bar chart, plus two stray white triangles
 * where the sails had been cut off from their boats. Matching the
 * viewBox to the frame, and anchoring to the bottom (xMidYMax) so the
 * waterline is the last thing to be cropped, keeps the composition
 * intact at every aspect this is used at.
 */
export default function AucklandSkylineArt({
  className = "",
  shape = "circle",
}: {
  className?: string;
  /** "circle" crops to a circle (standalone use); "fill" fills its box so a
   *  parent frame's own border-radius/clip-path does the cropping. */
  shape?: "circle" | "fill";
}) {
  return (
    <svg
      viewBox="0 0 800 440"
      preserveAspectRatio={shape === "circle" ? "xMidYMid slice" : "xMidYMax slice"}
      className={className}
      role="img"
      aria-label="Illustration of the Auckland skyline and harbour at dusk, with the Sky Tower and sailboats"
    >
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9c2" />
          <stop offset="40%" stopColor="#ffb3d1" />
          <stop offset="100%" stopColor="#b388ff" />
        </linearGradient>
        <linearGradient id="cs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7b3ce0" />
          <stop offset="100%" stopColor="#4b0fa5" />
        </linearGradient>
        <linearGradient id="cs-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a1090" />
          <stop offset="100%" stopColor="#2e0866" />
        </linearGradient>
        <radialGradient id="cs-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff2d5" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
        <clipPath id="cs-circle">
          <circle cx="400" cy="220" r="220" />
        </clipPath>
      </defs>

      <g clipPath={shape === "circle" ? "url(#cs-circle)" : undefined}>
        <rect width="800" height="440" fill="url(#cs-sky)" />

        {/* low sun behind the city */}
        <circle cx="250" cy="250" r="150" fill="url(#cs-sun)" />
        <circle cx="250" cy="252" r="34" fill="#fff0cf" opacity="0.85" />

        {/* Rangitoto on the horizon — the low, symmetrical cone that sits
            behind the harbour in every view east from the city */}
        <path d="M560 300 Q 640 244 720 300 Z" fill="#8f5ce0" opacity="0.45" />
        <path d="M700 300 Q 748 268 800 300 Z" fill="#8f5ce0" opacity="0.3" />

        {/* far towers */}
        <g fill="#7a37e0" opacity="0.5">
          <rect x="40" y="196" width="34" height="108" rx="3" />
          <rect x="86" y="168" width="28" height="136" rx="3" />
          <rect x="612" y="214" width="30" height="90" rx="3" />
          <rect x="652" y="236" width="38" height="68" rx="3" />
        </g>

        {/* mid towers, with lit windows */}
        <g>
          <rect x="128" y="150" width="46" height="154" rx="4" fill="#6416c8" />
          <rect x="186" y="120" width="40" height="184" rx="4" fill="#5712ac" />
          <rect x="470" y="140" width="44" height="164" rx="4" fill="#5712ac" />
          <rect x="526" y="176" width="36" height="128" rx="4" fill="#6416c8" />
          <rect x="238" y="198" width="34" height="106" rx="4" fill="#6f1fd6" />
          <rect x="430" y="206" width="30" height="98" rx="4" fill="#6f1fd6" />
          <g fill="#ffd88a" opacity="0.75">
            <rect x="138" y="166" width="7" height="9" rx="1.5" />
            <rect x="153" y="166" width="7" height="9" rx="1.5" />
            <rect x="138" y="188" width="7" height="9" rx="1.5" />
            <rect x="153" y="210" width="7" height="9" rx="1.5" />
            <rect x="196" y="140" width="7" height="9" rx="1.5" />
            <rect x="210" y="140" width="7" height="9" rx="1.5" />
            <rect x="196" y="164" width="7" height="9" rx="1.5" />
            <rect x="210" y="188" width="7" height="9" rx="1.5" />
            <rect x="480" y="158" width="7" height="9" rx="1.5" />
            <rect x="494" y="158" width="7" height="9" rx="1.5" />
            <rect x="480" y="182" width="7" height="9" rx="1.5" />
            <rect x="494" y="206" width="7" height="9" rx="1.5" />
            <rect x="536" y="196" width="7" height="9" rx="1.5" />
            <rect x="536" y="218" width="7" height="9" rx="1.5" />
          </g>
        </g>

        {/* Sky Tower — shaft, observation pod, upper deck and mast */}
        <g>
          <path d="M344 304 L352 118 L364 118 L372 304 Z" fill="url(#cs-tower)" />
          <ellipse cx="358" cy="120" rx="30" ry="11" fill="#3b0b7d" />
          <rect x="330" y="104" width="56" height="20" rx="8" fill="#4a1090" />
          <ellipse cx="358" cy="104" rx="28" ry="9" fill="#5a17ad" />
          <rect x="338" y="86" width="40" height="16" rx="6" fill="#3b0b7d" />
          <rect x="354" y="34" width="8" height="54" rx="3" fill="#3b0b7d" />
          <circle cx="358" cy="30" r="5" fill="#ff5ea8" />
          <g fill="#ffd88a" opacity="0.9">
            <rect x="338" y="108" width="6" height="7" rx="1.5" />
            <rect x="350" y="108" width="6" height="7" rx="1.5" />
            <rect x="362" y="108" width="6" height="7" rx="1.5" />
            <rect x="374" y="108" width="6" height="7" rx="1.5" />
          </g>
        </g>

        {/* waterfront edge + harbour */}
        <rect x="0" y="300" width="800" height="140" fill="url(#cs-water)" />
        <path d="M0 300 Q 200 292 400 300 T 800 300 V330 H0 Z" fill="#8b2cff" opacity="0.45" />

        {/* reflections */}
        <g stroke="#c9a6ff" strokeLinecap="round" opacity="0.35">
          <line x1="358" y1="312" x2="358" y2="356" strokeWidth="5" />
          <line x1="206" y1="312" x2="206" y2="340" strokeWidth="4" />
          <line x1="492" y1="312" x2="492" y2="344" strokeWidth="4" />
          <line x1="150" y1="312" x2="150" y2="332" strokeWidth="3" />
          <line x1="544" y1="312" x2="544" y2="330" strokeWidth="3" />
        </g>
        <g stroke="#ffffff" strokeLinecap="round" opacity="0.16">
          <line x1="60" y1="352" x2="180" y2="352" strokeWidth="3" />
          <line x1="620" y1="340" x2="740" y2="340" strokeWidth="3" />
          <line x1="250" y1="392" x2="420" y2="392" strokeWidth="3" />
          <line x1="480" y1="410" x2="640" y2="410" strokeWidth="3" />
        </g>

        {/* City of Sails — full boats, hull and all */}
        <g>
          <path d="M168 352 L168 306 L206 352 Z" fill="#ffffff" opacity="0.95" />
          <path d="M164 352 L160 306 L154 352 Z" fill="#ffffff" opacity="0.8" />
          <path d="M146 352 H212 L204 364 H154 Z" fill="#2e0866" />
          <path d="M596 372 L596 334 L628 372 Z" fill="#ffffff" opacity="0.95" />
          <path d="M592 372 L588 334 L583 372 Z" fill="#ffffff" opacity="0.78" />
          <path d="M578 372 H634 L627 383 H585 Z" fill="#2e0866" />
          <path d="M392 400 L392 372 L415 400 Z" fill="#ffffff" opacity="0.9" />
          <path d="M379 400 H421 L415 409 H385 Z" fill="#2e0866" />
        </g>

        {/* gulls */}
        <g stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round">
          <path d="M92 96 q 9 -8 18 0" />
          <path d="M118 78 q 7 -6 14 0" />
          <path d="M690 124 q 9 -8 18 0" />
        </g>
      </g>
    </svg>
  );
}
