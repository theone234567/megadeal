/** A business's "Features & amenities", typed as a comma-separated list:
 *  each one trimmed, blanks dropped, and repeats (in any capitals) kept
 *  once, in the order first typed (T249). */
export function amenityList(text: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of String(text ?? "").split(",")) {
    const item = raw.trim().replace(/\s+/g, " ");
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** The list as it's stored. */
export function cleanAmenities(text: unknown): string {
  return amenityList(text).join(", ");
}
