import type { Deal } from "./types";

// The V3 SDK returns products in a shape close to the REST API, with an
// `_id` alias for `id`. We read defensively since some fields depend on
// which `fields` were requested, and media items added via an external
// `url` (rather than a Wix Media Manager id) don't get their `image`
// sub-object populated — the raw `url` is what comes back instead.
export function mapProductToDeal(product: any, categoryNamesById?: Record<string, string>): Deal {
  const variant = product?.variantsInfo?.variants?.[0];
  // Get Product (by id/slug) returns per-variant pricing under
  // variantsInfo.variants[].price; Search Products only returns
  // aggregate actualPriceRange/compareAtPriceRange at the top level.
  // Fall back to the range shape so both response types map correctly.
  const price = variant?.price ?? {
    actualPrice: product?.actualPriceRange?.minValue,
    compareAtPrice: product?.compareAtPriceRange?.minValue,
  };

  const now = price?.actualPrice?.amount ? Number(price.actualPrice.amount) : 0;
  const was = price?.compareAtPrice?.amount
    ? Number(price.compareAtPrice.amount)
    : now;

  const discountPercent =
    was > now && was > 0 ? Math.round(100 - (now / was) * 100) : 0;

  const firstItem = product?.media?.itemsInfo?.items?.[0];
  const image: string | null =
    product?.media?.main?.image?.url ||
    product?.media?.main?.url ||
    firstItem?.image?.url ||
    firstItem?.url ||
    null;

  // Catalog V3's ALL_CATEGORIES_INFO field only returns category ids, not
  // names, so names are resolved separately via a category id -> name map
  // (see fetchDeals.ts) and fall back to any inline name Wix does provide.
  const categories: string[] =
    product?.allCategoriesInfo?.categories
      ?.map((c: any) => (categoryNamesById && c?.id ? categoryNamesById[c.id] : null) || c?.name)
      .filter(Boolean) ?? [];

  return {
    id: product?.id ?? product?._id,
    slug: product?.slug ?? product?.id ?? product?._id,
    name: product?.name ?? "",
    description: product?.plainDescription ?? "",
    image,
    now,
    was,
    formattedNow: price?.actualPrice?.formattedAmount ?? null,
    formattedWas: price?.compareAtPrice?.formattedAmount ?? null,
    discountPercent,
    currency: product?.currency ?? "USD",
    ribbon: product?.ribbon?.name ?? null,
    categories,
    variantId: variant?.id ?? variant?._id ?? null,
    inStock: variant?.inventoryStatus?.inStock ?? true,
    expiresAt: null,
    status: null,
    merchantEmail: null,
    businessName: null,
    businessLogoUrl: null,
  };
}
