// The V3 SDK returns products in a shape close to the REST API, with an
// `_id` alias for `id`. We read defensively since some fields depend on
// which `fields` were requested, and media items added via an external
// `url` (rather than a Wix Media Manager id) don't get their `image`
// sub-object populated — the raw `url` is what comes back instead.
/**
 * The product from a Stores V3 SDK read. `getProductBySlug` resolves to
 * `{ product }`, but `getProduct` (by id) resolves to the product itself —
 * reading `.product` off the latter silently gave undefined, which is how
 * business profile pages came to list no deals at all.
 */
export function unwrapProduct(res: any): any {
  return res?.product ?? (res?.id || res?._id ? res : null);
}

/** Wix returns plainDescription as HTML ("<p>…</p>") even when it was
 *  created from plain text. Pages render descriptions as text, so turn
 *  paragraphs and line breaks back into newlines and drop the tags. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
