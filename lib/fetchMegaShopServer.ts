import "server-only";
import { createWixAdminClient } from "./wixAdmin";
import { mapProductToDeal } from "./mapDeal";
import { isMegaShopProduct } from "./categories";
import type { Deal } from "./types";

const FULL_FIELDS = ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"];

/**
 * MegaShop's server-side product fetch, admin-client-backed for the same
 * reliability reasons as lib/fetchDealServer.ts — this never touches the
 * flaky visitor OAuth client, and lets /megashop render its catalog (and
 * pick between the catalog and the "coming soon" waitlist) server-side.
 */
export async function fetchMegaShopProductsForServer(): Promise<Deal[]> {
  try {
    const adminClient = createWixAdminClient();
    const res = await adminClient.productsV3.searchProducts({
      cursorPaging: { limit: 100 },
      fields: FULL_FIELDS,
    } as any);
    const products = ((res as any).products ?? []).filter(isMegaShopProduct);
    return products.map((p: any) => mapProductToDeal(p, {}));
  } catch (err) {
    console.error("[fetchMegaShopProductsForServer] failed", err);
    return [];
  }
}

export async function fetchMegaShopProductBySlugForServer(slug: string): Promise<Deal | null> {
  try {
    const adminClient = createWixAdminClient();
    const res = await adminClient.productsV3.getProductBySlug(slug, {
      fields: FULL_FIELDS,
    } as any);
    const product = (res as any).product;
    if (!product || !isMegaShopProduct(product)) return null;
    return mapProductToDeal(product, {});
  } catch {
    return null;
  }
}
