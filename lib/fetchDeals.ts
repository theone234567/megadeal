import type { WixClient } from "./wixClient";
import type { Deal } from "./types";
import { mapProductToDeal } from "./mapDeal";

const FULL_FIELDS = ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"];

/**
 * Search Products (Catalog V3) doesn't return variant-level pricing, so we
 * hydrate each result with a Get Product call to pick up actualPrice /
 * compareAtPrice / media. The catalog here is small (a handful of deals),
 * so per-product hydration stays cheap.
 */
export async function fetchDeals(client: WixClient): Promise<Deal[]> {
  const searchResult = await client.productsV3.searchProducts({});
  const basics = searchResult.products ?? [];

  const full = await Promise.all(
    basics.slice(0, 48).map(async (p: any) => {
      try {
        const res = await client.productsV3.getProduct(p.id ?? p._id, {
          fields: FULL_FIELDS,
        } as any);
        return (res as any).product;
      } catch {
        return p;
      }
    })
  );

  return full.filter(Boolean).map(mapProductToDeal);
}

export async function fetchDealBySlug(
  client: WixClient,
  slug: string
): Promise<Deal | null> {
  try {
    const res = await client.productsV3.getProductBySlug(slug, {
      fields: FULL_FIELDS,
    } as any);
    const product = (res as any).product;
    if (!product) return null;
    return mapProductToDeal(product);
  } catch {
    return null;
  }
}
