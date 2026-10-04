import Image from "next/image";
import { LOGO_STYLE } from "@/lib/brand";
import { LOGO_VIEWBOX, MARK, WORDMARK, WORDMARK_TRANSFORM } from "./brand/logoPaths";

/** Where the logo sits. Each place keeps its own size, as before. */
export type LogoPlacement = "site" | "landing" | "portal";

/**
 * The MegaDeal logo, for every header. Which logo it draws is set once, in
 * lib/brand.ts (LOGO_STYLE); nothing else needs to change to switch back.
 *
 * Decorative here: every caller wraps it in a link that carries the name
 * ("MegaDeal home"), so the logo itself is hidden from screen readers
 * rather than announced twice.
 */
export default function BrandLogo({
  placement,
  tone = "onLight",
  className = "",
}: {
  placement: LogoPlacement;
  /** "onLight": purple, for white or pale lavender surfaces. "onDark":
   *  white, for purple or dark ones. Ignored by the classic logo, which
   *  was only ever used on white. */
  tone?: "onLight" | "onDark";
  className?: string;
}) {
  if (LOGO_STYLE === "classic") return <ClassicLogo placement={placement} className={className} />;

  return (
    <svg
      viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
      width={LOGO_VIEWBOX.width}
      height={LOGO_VIEWBOX.height}
      aria-hidden
      focusable="false"
      className={`block w-auto shrink-0 select-none ${MINIMAL_HEIGHT[placement]} ${
        tone === "onDark" ? "text-white" : "text-brand-600"
      } ${className}`}
    >
      <g fill="currentColor">
        <path fillRule="evenodd" d={MARK} />
        <path transform={WORDMARK_TRANSFORM} d={WORDMARK} />
      </g>
    </svg>
  );
}

// The flat lockup is about 4.8:1 and has no empty space around it, so it
// needs less height than the classic image for the same presence: about
// 130px wide on phones and 160px on desktop (15% under the first sizes,
// 4 Oct 2026, so the header is less dominant).
const MINIMAL_HEIGHT: Record<LogoPlacement, string> = {
  // 24px under 360px wide, where "All areas" and the menu share its row.
  site: "h-5 min-[360px]:h-[27px] lg:h-[34px]",
  landing: "h-6 sm:h-[27px] lg:h-[31px]",
  portal: "h-7",
};

/**
 * The previous logo, file for file and size for size, so LOGO_STYLE =
 * "classic" puts every header back exactly as it was. The portal used the
 * larger copy of the same artwork.
 */
const CLASSIC: Record<LogoPlacement, { src: string; width: number; height: number; className: string }> = {
  site: { src: "/branding/megadeal-logo.webp", width: 600, height: 200, className: "h-12 lg:h-14" },
  landing: { src: "/branding/megadeal-logo.webp", width: 600, height: 200, className: "h-9 sm:h-11 lg:h-12" },
  portal: { src: "/megadeal/megadeal-logo.webp", width: 2000, height: 667, className: "h-8" },
};

function ClassicLogo({ placement, className }: { placement: LogoPlacement; className: string }) {
  const c = CLASSIC[placement];
  return (
    <Image
      src={c.src}
      alt=""
      width={c.width}
      height={c.height}
      priority
      className={`w-auto select-none object-contain ${c.className} ${className}`}
    />
  );
}
