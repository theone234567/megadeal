/**
 * Reads every row a Wix Data query matches, not just the first page.
 *
 * Wix Data's find() returns a default page of 50 and accepts a limit of at
 * most 1000 (https://dev.wix.com/docs/velo/apis/wix-data/wix-data-query/limit).
 * Every unbounded find() in this app was therefore reading 50 rows and
 * treating them as the whole collection — silently, with no error and no
 * missing-data warning, and correctly right up until the 51st row exists.
 *
 * What that actually broke, all of it invisible until it happened:
 *
 *  - The public "X businesses signed up" figure froze at 50 while still
 *    being presented as a true count.
 *  - Deals belonging to the 51st merchant onward lost their business
 *    details on the storefront — no name, no booking link, no address —
 *    because the email-to-business map didn't contain them.
 *  - A business's own public profile page 404'd, because the lookup
 *    fetched a page of merchants and scanned it in memory for one id.
 *  - The admin dashboard listed 50 businesses and no more, with its own
 *    search and pagination quietly operating on that truncated set.
 *
 * Pages with the maximum limit and a skip, which are both plainly
 * supported, rather than a cleverer query — an exact filter on _id would
 * be nicer for the profile lookup, but it cannot be tested against a real
 * Wix collection from here and a wrong guess would 404 every business
 * page. This cannot be wrong; it can only be slower.
 *
 * The page cap is a guard against an unbounded loop, not a real limit: at
 * 1000 rows a page it takes 20 pages to exceed what this site will hold
 * for years, and hitting it is logged rather than passed off as the end of
 * the data.
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export async function queryAllItems(
  build: () => any,
  label: string
): Promise<any[]> {
  const all: any[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await build().limit(PAGE_SIZE).skip(page * PAGE_SIZE).find();
    const items = result.items ?? [];
    all.push(...items);
    if (items.length < PAGE_SIZE) return all;
  }

  console.error(
    `[queryAll] ${label} hit the ${MAX_PAGES}-page cap (${MAX_PAGES * PAGE_SIZE} rows). ` +
      `Results are truncated — this needs real pagination, not a bigger cap.`
  );
  return all;
}
