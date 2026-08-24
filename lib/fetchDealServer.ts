import "server-only";
import { createWixAdminClient } from "./wixAdmin";
import { mapProductToDeal } from "./mapDeal";
import type { Deal } from "./types";

const CATEGORY_NAME_BY_ID: Record<string, string> = {
  "e0def6d9-af2f-4ea9-91f6-15ce3bd20ac7": "Food & Drink",
  "333efe51-7bfe-4357-a79a-5e63952d5791": "Beauty & Spa",
  "606adf09-ff58-490b-97f6-960587bf9cb1": "Things To Do",
  "870d3932-8296-4120-8dde-71159aa2bdf1": "Travel & Getaways",
  "909fc5df-6473-4a39-99e9-c23e665e9288": "Health & Fitness",
};

/**
 * Server-only deal lookup for generateMetadata/JSON-LD, deliberately
 * separate from lib/fetchDeals.ts (the client-side visitor-token path).
 * Runs on the admin (API key) client, which has proven reliable in Node —
 * the visitor OAuth client's browser-only flakiness doesn't apply here.
 */
export async function fetchDealForSEO(slug: string): Promise<Deal | null> {
  try {
    const adminClient = createWixAdminClient();
    const res = await adminClient.productsV3.getProductBySlug(slug, {
      fields: ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"],
    } as any);
    const product = (res as any).product;
    if (!product) return null;

    let deal = mapProductToDeal(product, CATEGORY_NAME_BY_ID);

    const dealsResult = await adminClient.items
      .query("Deals")
      .eq("productId", deal.id)
      .find();
    const record = dealsResult.items?.[0];
    const merchantEmail: string | null = record?.merchantEmail || null;
    if (record) {
      deal = {
        ...deal,
        expiresAt: record.expiresAt ?? null,
        status: record.status ?? null,
        image: record.photoUrl || deal.image,
      };
    }

    if (deal.status !== null && deal.status !== "Live") return null;

    if (merchantEmail) {
      const merchantResult = await adminClient.items
        .query("Merchants")
        .eq("email", merchantEmail)
        .find();
      const merchant = merchantResult.items?.[0];
      if (merchant?.businessName) {
        deal = {
          ...deal,
          businessName: merchant.businessName,
          businessLogoUrl: merchant.logoUrl || null,
        };
      }
    }

    return deal;
  } catch {
    return null;
  }
}

/** All publicly live deal slugs, for sitemap generation. */
export async function fetchAllLiveDealSlugsForSitemap(): Promise<
  { slug: string; updatedAt: string | null }[]
> {
  try {
    const adminClient = createWixAdminClient();
    const res = await adminClient.productsV3.searchProducts({
      cursorPaging: { limit: 100 },
    });
    const products = (res as any).products ?? [];

    const dealsResult = await adminClient.items.query("Deals").find();
    const statusByProductId: Record<string, string | null> = {};
    for (const item of dealsResult.items ?? []) {
      if (item.productId) statusByProductId[item.productId] = item.status ?? null;
    }

    return products
      .filter((p: any) => {
        const status = statusByProductId[p.id ?? p._id];
        return status === undefined || status === null || status === "Live";
      })
      .map((p: any) => ({
        slug: p.slug ?? p.id ?? p._id,
        updatedAt: p.updatedDate ?? null,
      }))
      .filter((d: { slug: string | undefined }) => Boolean(d.slug));
  } catch {
    return [];
  }
}
