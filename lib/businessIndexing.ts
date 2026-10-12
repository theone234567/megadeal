/**
 * Whether a business's public page is worth showing to search engines.
 * One with no live deal, no bio and no photos is a name and maybe a
 * phone number: a thin page that adds nothing to a search result and
 * counts against the site's quality as a whole. It stays reachable (old
 * links, shares) but is left out of the sitemap and marked noindex until
 * it has something on it.
 */
export function businessPageIsThin(b: { liveDeals: number; bio: string | null | undefined; photos: number }): boolean {
  return b.liveDeals === 0 && !(b.bio ?? "").trim() && b.photos === 0;
}
