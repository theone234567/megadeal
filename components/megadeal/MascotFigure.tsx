import Image from "next/image";

type Props = {
  /** Resolved PNG path from getMegadealArt(), or null when not supplied yet. */
  src: string | null;
  /** Vector file to use until the artwork lands. Must exist in /public. */
  fallbackSrc: string;
  /** Empty string marks it decorative, which is right wherever nearby text
   *  already says the same thing. */
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Set on the hero mascot only — it's above the fold. */
  priority?: boolean;
};

/**
 * One of the supplied mascot illustrations, falling back to the vector
 * artwork already in /public/brand until the PNG is added.
 *
 * The fallback is the point. These illustrations are supplied assets, so
 * the page cannot assume they are present — and pointing <Image> at a file
 * that isn't there would put broken-image glyphs across the live page,
 * which is worse than the vector it replaces. Both are the same character
 * in the same pose, so the layout is identical either way and the swap is
 * a fidelity upgrade rather than a change of design.
 *
 * next/image is used as asked, though the project sets images.unoptimized
 * (OpenNext on Workers was returning blank remote images through the
 * optimiser), so this is mainly buying width/height reservation against
 * layout shift — which for a mascot overhanging the hero is worth having.
 */
export default function MascotFigure({
  src,
  fallbackSrc,
  alt,
  width,
  height,
  className = "",
  priority = false,
}: Props) {
  return (
    <Image
      src={src ?? fallbackSrc}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={`pointer-events-none select-none ${className}`}
    />
  );
}
