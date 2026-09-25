/**
 * Single source of truth for the site's fixed storefront categories —
 * previously duplicated (name/emoji in CategoryNav, id/name maps in
 * fetchDeals.ts and fetchDealServer.ts), which risked the copies drifting
 * apart. IDs are the real Wix Stores category ids for this site.
 *
 * `slug` is the category's URL segment (/category/food-drink). Category
 * URLs used to be the display name percent-encoded
 * (/category/Food%20%26%20Drink); middleware.ts 308-redirects those old
 * URLs to the slug form. Treat a slug as permanent once the site has
 * launched — changing one means another redirect and lost search ranking.
 */
export interface CategoryDef {
  id: string;
  name: string;
  slug: string;
  emoji: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "e0def6d9-af2f-4ea9-91f6-15ce3bd20ac7", name: "Food & Drink", slug: "food-drink", emoji: "🍽️" },
  { id: "333efe51-7bfe-4357-a79a-5e63952d5791", name: "Beauty & Spa", slug: "beauty-spa", emoji: "💆" },
  { id: "606adf09-ff58-490b-97f6-960587bf9cb1", name: "Things To Do", slug: "things-to-do", emoji: "🎟️" },
  { id: "870d3932-8296-4120-8dde-71159aa2bdf1", name: "Travel & Getaways", slug: "travel-getaways", emoji: "✈️" },
  { id: "909fc5df-6473-4a39-99e9-c23e665e9288", name: "Health & Fitness", slug: "health-fitness", emoji: "🏋️" },
  { id: "9f5ab7d9-624c-4cc2-b923-7c3a2e97aa6d", name: "Home & Car", slug: "home-car", emoji: "🔧" },
];

export function categoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Site-relative URL of a category's page, from its display name. */
export function categoryPath(name: string): string {
  const category = CATEGORIES.find((c) => c.name === name);
  return `/category/${category ? category.slug : encodeURIComponent(name)}`;
}

/**
 * Resolves an old-style category URL segment (the percent-encoded display
 * name) to its category, for redirecting to the slug URL.
 */
export function categoryByLegacySegment(segment: string): CategoryDef | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return undefined;
  }
  return CATEGORIES.find((c) => c.name === decoded);
}

export const CATEGORY_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.name])
);

export const CATEGORY_ID_BY_NAME: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.name, c.id])
);

/**
 * MegaShop.co.nz products live in the same Wix Stores catalog as MegaDeal's
 * deal-listing products, kept isolated only by category membership — a
 * product in this category is never shown as a MegaDeal deal. Every
 * MegaDeal product-fetch path must request ALL_CATEGORIES_INFO and filter
 * through isMegaShopProduct() before mapping/displaying a product.
 */
export const MEGASHOP_CATEGORY_ID = "f97b5530-5218-4779-a221-20af6edc58a5";

export function isMegaShopProduct(product: any): boolean {
  return Boolean(
    product?.allCategoriesInfo?.categories?.some((c: any) => c?.id === MEGASHOP_CATEGORY_ID)
  );
}

/**
 * What a business can classify itself as in the portal — a superset of the
 * storefront categories above.
 *
 * These are deliberately separate lists. CATEGORIES drives the storefront:
 * the nav, the sitemap, /category/[name] pages, and the Wix Stores category
 * a deal's product is filed under — so every entry there needs a real Wix
 * category id. A business category needs no id at all: the portal form and
 * the Merchants record both store the name as plain text.
 *
 * "Home & Car" used to live only here, with no Wix category id and no
 * storefront page (coming-soon page flagged it hasCategoryPage: false).
 * Now that it has a real Wix Stores category, it's part of CATEGORIES
 * above and this list is simply every storefront category, unchanged in
 * shape so any future business-only category still has somewhere to go.
 */
export interface BusinessCategoryDef {
  name: string;
  emoji: string;
}

export const BUSINESS_CATEGORIES: BusinessCategoryDef[] = CATEGORIES.map(({ name, emoji }) => ({
  name,
  emoji,
}));

/** Server-side validation for a submitted business category. */
export function isBusinessCategory(value: string): boolean {
  return BUSINESS_CATEGORIES.some((c) => c.name === value);
}
