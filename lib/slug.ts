/** Pure string helpers, safe to import from both server and client code. */

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * A readable-but-unique business profile slug: the business name plus the
 * first segment of its Wix Data item id (8 hex chars, always present in a
 * UUID). No schema change needed — the id segment alone is enough to look
 * the merchant back up; the name part is just there for readability/SEO.
 */
export function businessSlug(name: string, id: string): string {
  const idPrefix = id.split("-")[0];
  return `${slugifyName(name)}-${idPrefix}`;
}

/** Extracts the id prefix from a business slug, or null if it isn't one. */
export function parseBusinessSlugIdPrefix(slug: string): string | null {
  const last = slug.split("-").pop() ?? "";
  return /^[0-9a-f]{8}$/.test(last) ? last : null;
}
