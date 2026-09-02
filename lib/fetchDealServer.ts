import "server-only";
import { createWixAdminClient } from "./wixAdmin";
import { mapProductToDeal } from "./mapDeal";
import { businessSlug } from "./slug";
import { CATEGORY_NAME_BY_ID, isMegaShopProduct } from "./categories";
import { mapMerchantToBusiness, applyBusinessToDeal, type PublicBusiness } from "./business";
import { isDealLive } from "./dealVisibility";
import type { Deal, DealStatus } from "./types";

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
    if (!product || isMegaShopProduct(product)) return null;

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
        isFlash: Boolean(record.isFlash),
        quantityAvailable:
          typeof record.quantityAvailable === "number" ? record.quantityAvailable : null,
        dealCode: record.dealCode || null,
      };
    }

    if (!isDealLive(deal)) return null;

    if (merchantEmail) {
      const merchantResult = await adminClient.items
        .query("Merchants")
        .eq("email", merchantEmail)
        .find();
      const merchant = merchantResult.items?.[0];
      if (merchant?.businessName && merchant._id) {
        deal = applyBusinessToDeal(deal, mapMerchantToBusiness(merchant));
      }
    }

    return deal;
  } catch {
    return null;
  }
}

/**
 * All currently-live deals with business info applied, server-rendered —
 * this is what backs the homepage, category pages, and flash deals list,
 * so the actual deal listings are present in the raw HTML a crawler gets
 * on first request instead of only appearing after client-side JS fetches
 * them. Same admin-client reliability story as fetchDealForSEO above, and
 * mirrors the shape lib/fetchDeals.ts's client-side fetchDeals() produces
 * exactly (same mapProductToDeal/applyBusinessToDeal/isDealLive calls) so
 * every consumer can keep working with the result identically either way.
 */
export async function fetchAllLiveDealsServer(): Promise<Deal[]> {
  try {
    const adminClient = createWixAdminClient();
    const [productsRes, dealsResult, merchantsResult] = await Promise.all([
      adminClient.productsV3.searchProducts({
        search: { cursorPaging: { limit: 100 } },
        fields: ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"],
      } as any),
      adminClient.items.query("Deals").find(),
      adminClient.items.query("Merchants").find(),
    ]);

    const products = ((productsRes as any).products ?? [])
      .filter(Boolean)
      .filter((p: any) => !isMegaShopProduct(p));

    const metaByProductId: Record<string, any> = {};
    for (const item of dealsResult.items ?? []) {
      if (item.productId) metaByProductId[item.productId] = item;
    }

    const businessByEmail: Record<string, PublicBusiness> = {};
    for (const m of merchantsResult.items ?? []) {
      if (m.email && m.businessName && m._id) {
        businessByEmail[String(m.email).toLowerCase()] = mapMerchantToBusiness(m);
      }
    }

    return products
      .map((p: any) => mapProductToDeal(p, CATEGORY_NAME_BY_ID))
      .map((deal: Deal) => {
        const meta = metaByProductId[deal.id];
        if (!meta) return deal;
        return {
          ...deal,
          expiresAt: meta.expiresAt ?? null,
          status: meta.status ?? null,
          image: meta.photoUrl || deal.image,
          isFlash: Boolean(meta.isFlash),
          quantityAvailable:
            typeof meta.quantityAvailable === "number" ? meta.quantityAvailable : null,
          dealCode: meta.dealCode || null,
        };
      })
      .filter((deal: Deal) => isDealLive(deal))
      .map((deal: Deal) => {
        const meta = metaByProductId[deal.id];
        const business = meta?.merchantEmail
          ? businessByEmail[String(meta.merchantEmail).toLowerCase()]
          : undefined;
        return business ? applyBusinessToDeal(deal, business) : deal;
      });
  } catch (err) {
    console.error("[fetchAllLiveDealsServer] failed", err);
    return [];
  }
}

export interface BusinessProfile extends PublicBusiness {
  id: string;
}

/**
 * Full business profile + all of their currently-live deals, for the
 * /business/[slug] page. Server-only, admin-client-backed for the same
 * reliability reasons as fetchDealForSEO — this never touches the flaky
 * visitor OAuth client. Only public-safe fields are returned (no email,
 * no credits balance, no application status).
 */
export async function fetchBusinessProfileBySlug(
  slugParam: string
): Promise<{ business: BusinessProfile; deals: Deal[] } | null> {
  try {
    const idPrefix = slugParam.split("-").pop();
    if (!idPrefix || !/^[0-9a-f]{8}$/.test(idPrefix)) return null;

    const adminClient = createWixAdminClient();
    const merchantsResult = await adminClient.items.query("Merchants").find();
    const merchant = (merchantsResult.items ?? []).find(
      (m: any) => typeof m._id === "string" && m._id.startsWith(idPrefix)
    );
    if (!merchant || !merchant.businessName || merchant.status === "Suspended") {
      return null;
    }

    const business: BusinessProfile = {
      id: merchant._id,
      ...mapMerchantToBusiness(merchant),
    };

    const dealsResult = await adminClient.items
      .query("Deals")
      .eq("merchantEmail", merchant.email)
      .find();
    const liveDealRecords = (dealsResult.items ?? []).filter(
      (d: any) =>
        d.productId &&
        isDealLive({ status: d.status ?? null, expiresAt: d.expiresAt ?? null })
    );

    const deals: Deal[] = [];
    for (const record of liveDealRecords) {
      try {
        const res = await adminClient.productsV3.getProduct(record.productId, {
          fields: ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"],
        } as any);
        const product = (res as any).product;
        if (!product) continue;
        const dealBase: Deal = {
          ...mapProductToDeal(product, CATEGORY_NAME_BY_ID),
          expiresAt: record.expiresAt ?? null,
          status: record.status ?? null,
          image: record.photoUrl || undefined,
          isFlash: Boolean(record.isFlash),
          quantityAvailable:
            typeof record.quantityAvailable === "number" ? record.quantityAvailable : null,
          dealCode: record.dealCode || null,
        };
        deals.push(applyBusinessToDeal(dealBase, business));
      } catch {
        // Skip products that fail to hydrate rather than failing the page.
      }
    }

    return { business, deals };
  } catch {
    return null;
  }
}

/** All non-suspended business profile slugs, for sitemap generation. */
export async function fetchAllBusinessSlugsForSitemap(): Promise<string[]> {
  try {
    const adminClient = createWixAdminClient();
    const merchantsResult = await adminClient.items.query("Merchants").find();
    return (merchantsResult.items ?? [])
      .filter((m: any) => m.businessName && m._id && m.status !== "Suspended")
      .map((m: any) => businessSlug(m.businessName, m._id));
  } catch {
    return [];
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
      fields: ["ALL_CATEGORIES_INFO"],
    } as any);
    const products = ((res as any).products ?? []).filter((p: any) => !isMegaShopProduct(p));

    const dealsResult = await adminClient.items.query("Deals").find();
    const metaByProductId: Record<string, { status: DealStatus | null; expiresAt: string | null }> = {};
    for (const item of dealsResult.items ?? []) {
      if (item.productId) {
        metaByProductId[item.productId] = {
          status: (item.status as DealStatus) ?? null,
          expiresAt: item.expiresAt ?? null,
        };
      }
    }

    return products
      .filter((p: any) => {
        const meta = metaByProductId[p.id ?? p._id];
        return !meta || isDealLive(meta);
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
