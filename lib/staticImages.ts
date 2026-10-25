/**
 * The site's own photos in public/ that also have 360, 480 and 640px-wide
 * copies (name-360.webp etc., made with sharp), each with its full width. A card shown
 * 260px wide fetched the 1200px original; with these as a srcset the
 * browser takes the 640px copy unless the screen needs more.
 */
const FULL_WIDTH: Record<string, number> = {
  "/images/advertise/things-to-do/adventure-outdoors-v1.webp": 1200,
  "/images/advertise/things-to-do/cruises-day-trips-v1.webp": 1200,
  "/images/advertise/things-to-do/family-experiences-v1.webp": 1200,
  "/images/advertise/things-to-do/indoor-activities-v1.webp": 1200,
  "/images/advertise/things-to-do/tours-sightseeing-v1.webp": 1200,
  "/images/advertise/things-to-do/workshops-classes-v1.webp": 1200,
  "/images/beauty-spa/beauty-facial.webp": 900,
  "/images/beauty-spa/beauty-massage.webp": 900,
  "/images/beauty-spa/beauty-nails.webp": 900,
  "/megadeal-coming-soon/health-fitness-v1.webp": 800,
  "/megadeal-coming-soon/travel-getaways-v1.webp": 800,
  "/megadeal/restaurants/restaurant-hero-bright.webp": 1000,
};

/** "x-360.webp 360w, x-480.webp 480w, x-640.webp 640w, x.webp 1200w" for
 *  a photo listed above, else undefined. 360 and 480 for phones (T245):
 *  a 360px-wide card took the 640px copy at least. */
export function staticImageSrcSet(src: string): string | undefined {
  const width = FULL_WIDTH[src];
  if (!width) return undefined;
  const copy = (w: number) => `${src.replace(/\.webp$/, `-${w}.webp`)} ${w}w`;
  return `${copy(360)}, ${copy(480)}, ${copy(640)}, ${src} ${width}w`;
}
