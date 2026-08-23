import type { Deal } from "./types";

// The V3 SDK returns products in a shape close to the REST API, with an
// `_id` alias for `id`. We read defensively since some fields depend on
// which `fields` were requested, and media items added via an external
// `url` (rather than a Wix Media Manager id) don't get their `image`
// sub-object populated — the raw `url` is what comes back instead.
export function mapProductToDeal(product: any): Deal {
  const variant = product?.variantsInfo?.variants?.[0];
  const price = variant?.price;

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

  const categories: string[] =
    product?.allCategoriesInfo?.categories
      ?.map((c: any) => c?.name)
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
  };
}
