/** Up to this many photos per business — matches PhotoGalleryField's grid. */
export const MAX_BUSINESS_PHOTOS = 6;

/**
 * Business photos are stored as a JSON array of Wix Media URLs in a single
 * Merchants text field, the same "structured data in a text field" pattern
 * businessHours already uses — no new Wix Data field type needed.
 */
export function parseBusinessPhotos(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === "string" && p.length > 0).slice(0, MAX_BUSINESS_PHOTOS);
  } catch {
    return [];
  }
}

export function serializeBusinessPhotos(photos: string[]): string {
  return JSON.stringify(photos.slice(0, MAX_BUSINESS_PHOTOS));
}
