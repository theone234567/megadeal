import type { WixClient } from "./wixClient";
import type { Deal, DealStatus } from "./types";
import { mapProductToDeal } from "./mapDeal";

const FULL_FIELDS = ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"];

interface DealMeta {
  expiresAt: string | null;
  status: DealStatus | null;
  photoUrl: string | null;
}

/**
 * The "Deals" CMS collection holds per-product metadata that isn't part of
 * the Wix Stores catalog itself: the real expiry date, the moderation
 * status (Pending Approval / Live / Paused / Cancelled), and an optional
 * merchant-uploaded photo override. Read access is public, so this is safe
 * to call from the storefront. A product with no matching Deals record is
 * treated as a legacy/admin-managed listing and always shown as live.
 */
async function fetchDealMetaMap(client: WixClient): Promise<Record<string, DealMeta>> {
  try {
    const result = await (client as any).items.query("Deals").find();
    const map: Record<string, DealMeta> = {};
    for (const item of result.items ?? []) {
      if (item.productId) {
        map[item.productId] = {
          expiresAt: item.expiresAt ?? null,
          status: item.status ?? null,
          photoUrl: item.photoUrl || null,
        };
      }
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Catalog V3's ALL_CATEGORIES_INFO field only returns category ids on each
 * product, not names, so names are resolved via this lookup instead of a
 * live API call. The 5 storefront categories are fixed (see CategoryNav)
 * and rarely change, and a live categories.queryCategories() call turned
 * out to be unreliable for the visitor OAuth client in production (it
 * failed outright in the browser), so a static map is both simpler and
 * removes an extra network round-trip from every deal-listing fetch.
 */
const CATEGORY_NAME_BY_ID: Record<string, string> = {
  "e0def6d9-af2f-4ea9-91f6-15ce3bd20ac7": "Food & Drink",
  "333efe51-7bfe-4357-a79a-5e63952d5791": "Beauty & Spa",
  "606adf09-ff58-490b-97f6-960587bf9cb1": "Things To Do",
  "870d3932-8296-4120-8dde-71159aa2bdf1": "Travel & Getaways",
  "909fc5df-6473-4a39-99e9-c23e665e9288": "Health & Fitness",
};

function applyMeta(deal: Deal, meta: DealMeta | undefined): Deal {
  if (!meta) return deal;
  return {
    ...deal,
    expiresAt: meta.expiresAt,
    status: meta.status,
    image: meta.photoUrl || deal.image,
  };
}

/** A deal is visible on the public site unless it has a status that explicitly hides it. */
function isPubliclyVisible(deal: Deal): boolean {
  return deal.status === null || deal.status === "Live";
}

/**
 * client.productsV3.searchProducts() reliably resolves with zero products
 * in the deployed browser client — confirmed via a console diagnostic
 * across three different request shapes (empty, with cursorPaging) — even
 * though the identical query against www.wixapis.com succeeds every time
 * when called directly. The SDK module resolves its own request URL
 * internally and may be routing through a different host/edge path than a
 * plain call to the documented REST endpoint. Bypassing the SDK's search
 * wrapper and hitting the endpoint directly (still using the SDK's own
 * auth token via fetchWithAuth) sidesteps whatever that difference is.
 */
async function searchAllProducts(client: WixClient): Promise<any[]> {
  const res = await client.fetchWithAuth(
    "https://www.wixapis.com/stores/v3/products/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: { cursorPaging: { limit: 100 } } }),
    }
  );
  if (!res.ok) {
    console.error("[searchAllProducts] request failed", res.status, await res.text().catch(() => ""));
    return [];
  }
  const data = await res.json();
  return data.products ?? [];
}

export async function fetchDeals(client: WixClient): Promise<Deal[]> {
  const [basics, metaMap] = await Promise.all([
    searchAllProducts(client),
    fetchDealMetaMap(client),
  ]);

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
    .map((p) => mapProductToDeal(p, CATEGORY_NAME_BY_ID))
    .map((deal) => applyMeta(deal, metaMap[deal.id]))
    .filter(isPubliclyVisible);
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
    const deal = mapProductToDeal(product, CATEGORY_NAME_BY_ID);

    try {
      const metaResult = await (client as any).items
        .query("Deals")
        .eq("productId", deal.id)
        .find();
      const record = metaResult.items?.[0];
      const merged = applyMeta(deal, record
        ? { expiresAt: record.expiresAt ?? null, status: record.status ?? null, photoUrl: record.photoUrl || null }
        : undefined);
      return isPubliclyVisible(merged) ? merged : null;
    } catch {
      return deal;
    }
  } catch {
    return null;
  }
}
