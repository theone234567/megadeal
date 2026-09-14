import "server-only";

/**
 * Reads every product in the Stores catalogue, not just the first page.
 *
 * searchProducts is cursor-paged and its `limit` is capped at 100 by the
 * API itself, so 100 is a ceiling rather than a choice — every unpaged
 * call here was silently a "first 100 products" call. It is the same
 * failure as the 50-row Wix Data ceiling in lib/queryAll.ts: nothing
 * errors, nothing warns, and the code is correct right up until the 101st
 * product exists. What it would have taken out:
 *
 *  - the homepage, category pages and flash-deals list, which all render
 *    from one such call — deals past the first 100 products simply would
 *    not appear on the site at all;
 *  - the sitemap, which would stop telling Google about them;
 *  - the MegaShop catalogue, which filters that same page down to
 *    MegaShop products, so a handful of MegaShop items sitting behind 100
 *    deals would have left the shop looking empty.
 *
 * Two of the three callers also had `cursorPaging` at the top level of the
 * request instead of inside `search`, where the API expects it — an `as
 * any` on the argument meant the compiler never mentioned it. That request
 * carried no paging options at all; it just happened to look like it did.
 *
 * The page cap is a runaway guard, not a real limit, and hitting it is
 * logged rather than passed off as the end of the catalogue.
 */
const PAGE_LIMIT = 100;
const MAX_PAGES = 25;

export async function searchAllProducts(
  adminClient: any,
  fields: string[],
  label: string
): Promise<any[]> {
  const all: any[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res: any = await adminClient.productsV3.searchProducts({
      // The cursor encodes the query it was issued for, so later pages
      // carry the cursor alone rather than restating paging options.
      search: cursor ? { cursorPaging: { cursor } } : { cursorPaging: { limit: PAGE_LIMIT } },
      fields,
    } as any);

    for (const product of res?.products ?? []) {
      if (product) all.push(product);
    }

    const meta = res?.pagingMetadata;
    cursor = meta?.hasNext ? meta?.cursors?.next ?? null : null;
    if (!cursor) return all;
  }

  console.error(
    `[searchAllProducts] ${label} hit the ${MAX_PAGES}-page cap (${MAX_PAGES * PAGE_LIMIT} products). ` +
      `Results are truncated — this needs real pagination, not a bigger cap.`
  );
  return all;
}
