/**
 * A deal's extra photos (deals.gallery): up to four besides its main photo,
 * shown as a gallery on the deal page. The main photo stays the one on
 * cards, share previews and search results.
 */
export const MAX_DEAL_GALLERY = 4;

/**
 * The photos as a clean list: strings only, each once, never the main
 * photo again, at most MAX_DEAL_GALLERY, in the order given. `isValid`
 * decides which addresses are acceptable (an uploaded MegaDeal photo, or a
 * sample photo for a test deal); others are dropped.
 */
export function cleanGallery(value: unknown, main: string | null | undefined, isValid: (url: string) => boolean = () => true): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string" || !v || v.length > 500 || v === main || out.includes(v) || !isValid(v)) continue;
    out.push(v);
    if (out.length === MAX_DEAL_GALLERY) break;
  }
  return out;
}
