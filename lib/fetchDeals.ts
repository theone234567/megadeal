import type { WixClient } from "./wixClient";
import type { Deal } from "./types";
import { mapProductToDeal } from "./mapDeal";

const FULL_FIELDS = ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"];

/**
 * The "Deals" CMS collection holds the real, site-owner-editable expiry
 * date for each product (edited directly in the Wix dashboard's Content
 * Manager to extend a deal). Read access is public, so this is safe to
 * call from the storefront.
 */
async function fetchExpiryMap(client: WixClient): Promise<Record<string, string>> {
  try {
    const result = await (client as any).items.query("Deals").find();
    const map: Record<string, string> = {};
    for (const item of result.items ?? []) {
      if (item.productId && item.expiresAt) {
        map[item.productId] = item.expiresAt;
      }
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Search Products (Catalog V3) doesn't return variant-level pricing, so we
 * hydrate each result with a Get Product call to pick up actualPrice /
 * compareAtPrice / media. The catalog here is small (a handful of deals),
 * so per-product hydration stays cheap.
 */
export async function fetchDeals(client: WixClient): Promise<Deal[]> {
  const [searchResult, expiryMap] = await Promise.all([
    client.productsV3.searchProducts({}),
    fetchExpiryMap(client),
  ]);
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

  return full
    .filter(Boolean)
    .map(mapProductToDeal)
    .map((deal) => ({ ...deal, expiresAt: expiryMap[deal.id] ?? null }));
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
    const deal = mapProductToDeal(product);

    try {
      const expiryResult = await (client as any).items
        .query("Deals")
        .eq("productId", deal.id)
        .find();
      const expiresAt = expiryResult.items?.[0]?.expiresAt ?? null;
      return { ...deal, expiresAt };
    } catch {
      return deal;
    }
  } catch {
    return null;
  }
}
