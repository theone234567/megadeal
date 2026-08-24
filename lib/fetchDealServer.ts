import "server-only";
import { createWixAdminClient } from "./wixAdmin";
import { mapProductToDeal } from "./mapDeal";
import { businessSlug } from "./slug";
import { CATEGORY_NAME_BY_ID } from "./categories";
import type { Deal } from "./types";

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
      if (merchant?.businessName && merchant._id) {
        deal = {
          ...deal,
          businessName: merchant.businessName,
          businessLogoUrl: merchant.logoUrl || null,
          businessWebsite: merchant.website || null,
          businessPhone: merchant.phone || null,
          businessAddress: merchant.address || null,
          businessCity: merchant.city || null,
          businessSlug: businessSlug(merchant.businessName, merchant._id),
        };
      }
    }

    return deal;
  } catch {
    return null;
  }
}

export interface BusinessProfile {
  id: string;
  slug: string;
  businessName: string;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  bio: string | null;
  businessHours: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  priceRange: string | null;
  amenities: string[];
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
      slug: businessSlug(merchant.businessName, merchant._id),
      businessName: merchant.businessName,
      logoUrl: merchant.logoUrl || null,
      website: merchant.website || null,
      phone: merchant.phone || null,
      address: merchant.address || null,
      city: merchant.city || null,
      bio: merchant.bio || null,
      businessHours: merchant.businessHours || null,
      facebookUrl: merchant.facebookUrl || null,
      instagramUrl: merchant.instagramUrl || null,
      priceRange: merchant.priceRange || null,
      amenities: String(merchant.amenities || "")
        .split(",")
        .map((a: string) => a.trim())
        .filter(Boolean),
    };

    const dealsResult = await adminClient.items
      .query("Deals")
      .eq("merchantEmail", merchant.email)
      .find();
    const liveDealRecords = (dealsResult.items ?? []).filter(
      (d: any) => (!d.status || d.status === "Live") && d.productId
    );

    const deals: Deal[] = [];
    for (const record of liveDealRecords) {
      try {
        const res = await adminClient.productsV3.getProduct(record.productId, {
          fields: ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"],
        } as any);
        const product = (res as any).product;
        if (!product) continue;
        deals.push({
          ...mapProductToDeal(product, CATEGORY_NAME_BY_ID),
          expiresAt: record.expiresAt ?? null,
          status: record.status ?? null,
          image: record.photoUrl || undefined,
          businessName: business.businessName,
          businessLogoUrl: business.logoUrl,
          businessWebsite: business.website,
          businessPhone: business.phone,
          businessAddress: business.address,
          businessCity: business.city,
          businessSlug: business.slug,
        } as Deal);
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
