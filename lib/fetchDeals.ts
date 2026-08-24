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

/**
 * The Merchants collection isn't publicly readable (SITE_MEMBER_AUTHOR
 * scoped), so business names/logos come from a small public API route
 * that joins Deals+Merchants server-side (via the admin client) and
 * re-exposes only businessName/logoUrl, keyed by product id — never by
 * merchant email, so this can't be scraped for merchants' addresses.
 */
interface PublicBusiness {
  businessName: string;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
}

async function fetchBusinessDirectory(): Promise<Record<string, PublicBusiness>> {
  try {
    const res = await fetch("/api/public/merchant-directory");
    if (!res.ok) return {};
    const data = await res.json();
    return data.directory ?? {};
  } catch {
    return {};
  }
}

function applyBusiness(deal: Deal, directory: Record<string, PublicBusiness>): Deal {
  const business = directory[deal.id];
  if (!business) return deal;
  return {
    ...deal,
    businessName: business.businessName,
    businessLogoUrl: business.logoUrl,
    businessWebsite: business.website,
    businessPhone: business.phone,
    businessAddress: business.address,
    businessCity: business.city,
  };
}

/** A deal is visible on the public site unless it has a status that explicitly hides it. */
function isPubliclyVisible(deal: Deal): boolean {
  return deal.status === null || deal.status === "Live";
}

/**
 * client.productsV3.searchProducts() and client.productsV3.getProduct()
 * both proved unreliable in the deployed browser client — confirmed via
 * repeated console/on-page diagnostics — while the identical REST calls
 * against www.wixapis.com always succeed when called directly (including
 * via this same client's own fetchWithAuth, bypassing the SDK's own
 * request-building). Requesting full fields directly in the search call
 * also removes the need for a separate per-product hydration call
 * entirely, so there's no getProduct call left to be unreliable.
 */
async function searchAllProducts(client: WixClient): Promise<any[]> {
  const res = await client.fetchWithAuth(
    "https://www.wixapis.com/stores/v3/products/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        search: { cursorPaging: { limit: 100 } },
        fields: FULL_FIELDS,
      }),
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
  // Deliberately sequential, not Promise.all: on a brand-new client (first
  // page load, no cached auth token yet) firing multiple calls at once
  // raced over token setup and reliably left one of them resolving empty.
  // The first call here pays that one-time setup cost; everything after
  // reuses the now-cached token.
  const basics = await searchAllProducts(client);
  const [metaMap, directory] = await Promise.all([
    fetchDealMetaMap(client),
    fetchBusinessDirectory(),
  ]);

  return basics
    .filter(Boolean)
    .map((p) => mapProductToDeal(p, CATEGORY_NAME_BY_ID))
    .map((deal) => applyMeta(deal, metaMap[deal.id]))
    .filter(isPubliclyVisible)
    .map((deal) => applyBusiness(deal, directory));
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
        ? {
            expiresAt: record.expiresAt ?? null,
            status: record.status ?? null,
            photoUrl: record.photoUrl || null,
          }
        : undefined);
      if (!isPubliclyVisible(merged)) return null;
      const directory = await fetchBusinessDirectory();
      return applyBusiness(merged, directory);
    } catch {
      return deal;
    }
  } catch {
    return null;
  }
}
