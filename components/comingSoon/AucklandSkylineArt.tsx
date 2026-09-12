/**
 * Illustrated Auckland skyline at dusk — Sky Tower, Waitematā harbour,
 * Rangitoto and the City of Sails.
 *
 * This is hand-authored vector art, not a placeholder. There is no
 * licensed photograph of Auckland in the repo and this environment has
 * no outbound access to any image host to fetch or verify one, so the
 * illustration is built to stand on its own. To use a real photo
 * instead, drop a file at
 * public/images/auckland-hero.(avif|webp|jpg|jpeg|png) — the hero picks
 * it up automatically (see findHeroPhoto in app/coming-soon/page.tsx)
 * and this component stops rendering.
 *
 * The viewBox is deliberately WIDE (800x440). It used to be square while
 * the frames are 1.28:1 on desktop and 1.9:1 on mobile, so with
 * preserveAspectRatio="slice" the whole lower third was cropped away —
 * harbour, hulls and all — leaving rectangles floating on a gradient
 * that read as a bar chart. Anchoring to xMidYMax keeps the waterline as
 * the last thing to crop at any aspect.
 *
 * Composition note: the frame places a caption card over the lower left
 * and the elephant mascot over the lower right, so detail is kept in the
 * centre and upper band where it stays visible.
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
          <stop offset="0%" stopColor="#2a1364" />
          <stop offset="26%" stopColor="#7a3bbf" />
          <stop offset="54%" stopColor="#e8739f" />
          <stop offset="78%" stopColor="#ffb083" />
          <stop offset="100%" stopColor="#ffd9a8" />
        </linearGradient>
        <linearGradient id="cs-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffc79a" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffd0a6" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="cs-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6a2fae" />
          <stop offset="100%" stopColor="#8c52cf" />
        </linearGradient>
        <linearGradient id="cs-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d0b86" />
          <stop offset="100%" stopColor="#2a0663" />
        </linearGradient>
        <linearGradient id="cs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8c47e8" />
          <stop offset="45%" stopColor="#5c1abd" />
          <stop offset="100%" stopColor="#360b7d" />
        </linearGradient>
        <radialGradient id="cs-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff6e0" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#ffcf92" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffb37e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cs-vig" cx="0.5" cy="0.45" r="0.75">
          <stop offset="60%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#1b0540" stopOpacity="0.35" />
        </radialGradient>
        <clipPath id="cs-circle">
          <circle cx="400" cy="220" r="220" />
        </clipPath>
      </defs>

      <g clipPath={shape === "circle" ? "url(#cs-circle)" : undefined}>
        <rect width="800" height="440" fill="url(#cs-sky)" />

        {/* setting sun, low and centre-right so the caption card never
            sits on top of the brightest part of the sky */}
        <circle cx="470" cy="268" r="170" fill="url(#cs-sun)" />
        <circle cx="470" cy="270" r="30" fill="#fff4d8" opacity="0.9" />

        {/* a few early stars in the deep upper sky */}
        <g fill="#ffffff" opacity="0.55">
          <circle cx="92" cy="42" r="1.8" />
          <circle cx="188" cy="26" r="1.4" />
          <circle cx="286" cy="58" r="1.6" />
          <circle cx="612" cy="34" r="1.7" />
          <circle cx="706" cy="66" r="1.3" />
          <circle cx="528" cy="22" r="1.4" />
        </g>

        {/* Rangitoto — the low symmetrical cone on the eastern horizon,
            kept clear of the building cluster so it stays readable */}
        <path d="M636 296 Q 712 232 790 296 Z" fill="#5e2aa6" opacity="0.55" />
        <path d="M596 296 Q 640 266 684 296 Z" fill="#5e2aa6" opacity="0.38" />

        {/* warm haze sitting on the waterline, behind the city */}
        <rect x="0" y="214" width="800" height="86" fill="url(#cs-haze)" />

        {/* far skyline band */}
        <g fill="url(#cs-far)" opacity="0.75">
          <rect x="24" y="214" width="30" height="86" rx="3" />
          <rect x="62" y="192" width="24" height="108" rx="3" />
          <path d="M96 300 V186 L112 172 L128 186 V300 Z" />
          <rect x="556" y="222" width="26" height="78" rx="3" />
          <rect x="590" y="238" width="20" height="62" rx="3" />
          <rect x="726" y="232" width="26" height="68" rx="3" />
        </g>

        {/* main cluster */}
        <g fill="url(#cs-near)">
          <rect x="142" y="156" width="48" height="144" rx="4" />
          <path d="M200 300 V126 L224 108 L248 126 V300 Z" />
          <rect x="258" y="182" width="34" height="118" rx="4" />
          <rect x="300" y="210" width="26" height="90" rx="3" />
          <rect x="452" y="168" width="44" height="132" rx="4" />
          <path d="M506 300 V150 L528 134 L550 150 V300 Z" />
          <rect x="412" y="206" width="30" height="94" rx="3" />
          <rect x="656" y="196" width="36" height="104" rx="4" />
          <rect x="700" y="224" width="22" height="76" rx="3" />
        </g>

        {/* antenna details */}
        <g stroke="#2a0663" strokeWidth="3" strokeLinecap="round">
          <line x1="224" y1="108" x2="224" y2="86" />
          <line x1="528" y1="134" x2="528" y2="116" />
        </g>

        {/* lit windows */}
        <g fill="#ffd48a" opacity="0.8">
          <rect x="152" y="172" width="8" height="10" rx="2" />
          <rect x="168" y="172" width="8" height="10" rx="2" />
          <rect x="152" y="196" width="8" height="10" rx="2" />
          <rect x="168" y="220" width="8" height="10" rx="2" />
          <rect x="152" y="244" width="8" height="10" rx="2" />
          <rect x="212" y="146" width="8" height="10" rx="2" />
          <rect x="228" y="146" width="8" height="10" rx="2" />
          <rect x="212" y="172" width="8" height="10" rx="2" />
          <rect x="228" y="198" width="8" height="10" rx="2" />
          <rect x="212" y="224" width="8" height="10" rx="2" />
          <rect x="268" y="198" width="7" height="9" rx="2" />
          <rect x="268" y="222" width="7" height="9" rx="2" />
          <rect x="462" y="186" width="8" height="10" rx="2" />
          <rect x="478" y="186" width="8" height="10" rx="2" />
          <rect x="462" y="212" width="8" height="10" rx="2" />
          <rect x="478" y="238" width="8" height="10" rx="2" />
          <rect x="518" y="168" width="8" height="10" rx="2" />
          <rect x="532" y="168" width="8" height="10" rx="2" />
          <rect x="518" y="194" width="8" height="10" rx="2" />
          <rect x="666" y="214" width="7" height="9" rx="2" />
          <rect x="678" y="238" width="7" height="9" rx="2" />
        </g>

        {/* Sky Tower — shaft, observation pod, upper deck, mast */}
        <g>
          <path d="M352 300 L359 116 L371 116 L378 300 Z" fill="#240552" />
          <ellipse cx="365" cy="118" rx="31" ry="11" fill="#33076e" />
          <rect x="336" y="100" width="58" height="21" rx="8" fill="#3d0b86" />
          <ellipse cx="365" cy="100" rx="29" ry="9" fill="#4d13a3" />
          <rect x="345" y="80" width="40" height="17" rx="6" fill="#33076e" />
          <rect x="361" y="24" width="8" height="58" rx="3" fill="#33076e" />
          <circle cx="365" cy="20" r="5.5" fill="#ff4f9d" />
          <circle cx="365" cy="20" r="10" fill="#ff4f9d" opacity="0.3" />
          <g fill="#ffd48a" opacity="0.95">
            <rect x="344" y="105" width="6" height="8" rx="1.5" />
            <rect x="356" y="105" width="6" height="8" rx="1.5" />
            <rect x="368" y="105" width="6" height="8" rx="1.5" />
            <rect x="380" y="105" width="6" height="8" rx="1.5" />
          </g>
        </g>

        {/* harbour */}
        <rect x="0" y="300" width="800" height="140" fill="url(#cs-water)" />
        <path d="M0 300 Q 200 293 400 300 T 800 300 V324 H0 Z" fill="#a765ff" opacity="0.35" />

        {/* sun glitter path on the water, under the sun */}
        <g fill="#ffd9a8" opacity="0.4">
          <rect x="440" y="312" width="60" height="4" rx="2" />
          <rect x="450" y="326" width="40" height="4" rx="2" />
          <rect x="432" y="340" width="76" height="4" rx="2" />
          <rect x="452" y="356" width="36" height="3" rx="1.5" />
        </g>

        {/* building reflections */}
        <g stroke="#c9a6ff" strokeLinecap="round" opacity="0.3">
          <line x1="365" y1="310" x2="365" y2="366" strokeWidth="6" />
          <line x1="224" y1="310" x2="224" y2="346" strokeWidth="5" />
          <line x1="528" y1="310" x2="528" y2="342" strokeWidth="5" />
          <line x1="166" y1="310" x2="166" y2="332" strokeWidth="3" />
          <line x1="674" y1="310" x2="674" y2="330" strokeWidth="3" />
        </g>

        {/* ripples */}
        <g stroke="#ffffff" strokeLinecap="round" opacity="0.14">
          <line x1="52" y1="348" x2="168" y2="348" strokeWidth="3" />
          <line x1="612" y1="334" x2="736" y2="334" strokeWidth="3" />
          <line x1="96" y1="386" x2="268" y2="386" strokeWidth="3" />
          <line x1="540" y1="398" x2="700" y2="398" strokeWidth="3" />
          <line x1="300" y1="418" x2="470" y2="418" strokeWidth="3" />
        </g>

        {/* City of Sails — kept centre-band so the caption card and the
            mascot don't sit on top of them */}
        <g>
          <path d="M262 344 L262 300 L298 344 Z" fill="#ffffff" opacity="0.96" />
          <path d="M258 344 L254 302 L248 344 Z" fill="#ffffff" opacity="0.82" />
          <path d="M240 344 H306 L298 356 H248 Z" fill="#240552" />
          <path d="M258 360 L258 372 M290 360 L290 368" stroke="#ffffff" strokeWidth="2" opacity="0.18" />

          <path d="M596 330 L596 296 L625 330 Z" fill="#ffffff" opacity="0.94" />
          <path d="M592 330 L589 298 L584 330 Z" fill="#ffffff" opacity="0.78" />
          <path d="M578 330 H632 L625 340 H585 Z" fill="#240552" />

          <path d="M418 386 L418 360 L439 386 Z" fill="#ffffff" opacity="0.9" />
          <path d="M406 386 H445 L439 395 H411 Z" fill="#240552" />
        </g>

        {/* gulls */}
        <g stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.45" strokeLinecap="round">
          <path d="M104 118 q 10 -8 20 0" />
          <path d="M134 98 q 7 -6 14 0" />
          <path d="M690 140 q 10 -8 20 0" />
          <path d="M716 122 q 7 -6 14 0" />
        </g>

        <rect width="800" height="440" fill="url(#cs-vig)" />
      </g>
    </svg>
  );
}
