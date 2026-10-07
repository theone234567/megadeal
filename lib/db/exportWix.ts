import type { WixExport } from "./importWix";

/**
 * Reads everything MegaDeal keeps in Wix, from inside the site: the same as
 * scripts/wix-export.mjs, for Admin > Moving off Wix > "Copy data from Wix"
 * (app/api/admin/import-from-wix), so the move needs no terminal. Read-only.
 *
 * Unlike the site's everyday readers (lib/queryAll.ts), which log and carry
 * on past their page limit, a part that can't be read whole is reported
 * as failed: an import must never quietly leave records behind.
 */

export const EXPORTED_COLLECTIONS = ["Merchants", "Deals", "MerchantActivity", "EmailSignups", "ContactMessages", "SiteSettings"] as const;

const PAGE_SIZE = 100;
const MAX_PAGES = 500;
const PRODUCT_FIELDS = ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO", "PLAIN_DESCRIPTION"];

/** The few Wix calls used: the admin client (lib/wixAdmin.ts) has them. */
export interface WixReader {
  items: { query(name: string): { limit(n: number): { skip(n: number): { find(): Promise<{ items?: any[] }> } } } };
  productsV3: { searchProducts(opts: any): Promise<{ products?: any[]; pagingMetadata?: { hasNext?: boolean; cursors?: { next?: string | null } } }> };
}

export interface WixExportResult {
  data: WixExport;
  counts: Record<string, number>;
  /** Parts that couldn't be read whole: don't import while there are any. */
  failed: Record<string, string>;
}

/** Every record in one Wix collection, or an error if it can't be read whole. */
export async function readCollection(wix: WixReader, name: string): Promise<any[]> {
  const all: any[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = (await wix.items.query(name).limit(PAGE_SIZE).skip(page * PAGE_SIZE).find()).items ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return all;
  }
  throw new Error(`more than ${MAX_PAGES * PAGE_SIZE} records`);
}

async function readProducts(wix: WixReader): Promise<any[]> {
  const all: any[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await wix.productsV3.searchProducts({
      search: cursor ? { cursorPaging: { cursor } } : { cursorPaging: { limit: PAGE_SIZE } },
      fields: PRODUCT_FIELDS,
    });
    all.push(...(res?.products ?? []).filter(Boolean));
    cursor = res?.pagingMetadata?.hasNext ? (res.pagingMetadata.cursors?.next ?? null) : null;
    if (!cursor) return all;
  }
  throw new Error(`more than ${MAX_PAGES * PAGE_SIZE} products`);
}

export async function exportWix(wix: WixReader): Promise<WixExportResult> {
  const data: WixExport = { Merchants: [], Deals: [], MerchantActivity: [], EmailSignups: [], ContactMessages: [], SiteSettings: [], StoresProducts: [] };
  const counts: Record<string, number> = {};
  const failed: Record<string, string> = {};
  for (const name of EXPORTED_COLLECTIONS) {
    try {
      data[name] = await readCollection(wix, name);
      counts[name] = data[name].length;
    } catch (err) {
      failed[name] = err instanceof Error ? err.message : String(err);
    }
  }
  try {
    data.StoresProducts = await readProducts(wix);
    counts.StoresProducts = data.StoresProducts.length;
  } catch (err) {
    failed.StoresProducts = err instanceof Error ? err.message : String(err);
  }
  return { data, counts, failed };
}
