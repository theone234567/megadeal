/**
 * A restrained, illustrated Auckland skyline (Sky Tower + harbour +
 * sailboats) rather than a stock photo. There's no real licensed
 * photography asset for this in the repo, and this environment has no
 * outbound access to Unsplash/Pixabay/Pexels to source or verify one — see
 * the redesign summary for how to swap this for a real photo later
 * (drop a file in public/images/ and replace this component's usage in
 * ComingSoonHero with a plain next/image).
 */
export default function AucklandSkylineArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role="img"
      aria-label="Illustration of the Auckland skyline and harbour at dusk"
    >
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9c2" />
          <stop offset="45%" stopColor="#ffb3d1" />
          <stop offset="100%" stopColor="#c194ff" />
        </linearGradient>
        <linearGradient id="cs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a35cff" />
          <stop offset="100%" stopColor="#650fc7" />
        </linearGradient>
        <clipPath id="cs-circle">
          <circle cx="200" cy="200" r="200" />
        </clipPath>
      </defs>

      <g clipPath="url(#cs-circle)">
        <rect width="400" height="400" fill="url(#cs-sky)" />

        {/* distant buildings */}
        <g fill="#7a17f0" opacity="0.55">
          <rect x="30" y="190" width="26" height="110" rx="2" />
          <rect x="64" y="170" width="22" height="130" rx="2" />
          <rect x="300" y="180" width="24" height="120" rx="2" />
          <rect x="330" y="200" width="30" height="100" rx="2" />
        </g>

        {/* mid buildings */}
        <g fill="#650fc7">
          <rect x="90" y="150" width="30" height="150" rx="2" />
          <rect x="128" y="130" width="26" height="170" rx="2" />
          <rect x="240" y="140" width="28" height="160" rx="2" />
          <rect x="272" y="160" width="24" height="140" rx="2" />
        </g>

        {/* Sky Tower */}
        <g fill="#440e82">
          <rect x="192" y="60" width="10" height="150" rx="2" />
          <ellipse cx="197" cy="95" rx="20" ry="8" />
          <polygon points="197,20 202,60 192,60" />
        </g>

        {/* harbour water */}
        <rect x="0" y="300" width="400" height="100" fill="url(#cs-water)" />
        <path d="M0 300 Q 100 288 200 300 T 400 300 V400 H0 Z" fill="#8b2cff" opacity="0.5" />

        {/* sailboats */}
        <g fill="#ffffff" opacity="0.9">
          <path d="M120 300 V265 L150 300 Z" />
          <rect x="118" y="298" width="30" height="6" rx="2" />
          <path d="M260 305 V275 L285 305 Z" />
          <rect x="258" y="303" width="28" height="6" rx="2" />
        </g>
      </g>
    </svg>
  );
}
