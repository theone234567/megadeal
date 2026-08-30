/**
 * Single source of truth for the site's 5 fixed storefront categories —
 * previously duplicated (name/emoji in CategoryNav, id/name maps in
 * fetchDeals.ts and fetchDealServer.ts), which risked the copies drifting
 * apart. IDs are the real Wix Stores category ids for this site.
 */
export interface CategoryDef {
  id: string;
  name: string;
  emoji: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "e0def6d9-af2f-4ea9-91f6-15ce3bd20ac7", name: "Food & Drink", emoji: "🍽️" },
  { id: "333efe51-7bfe-4357-a79a-5e63952d5791", name: "Beauty & Spa", emoji: "💆" },
  { id: "606adf09-ff58-490b-97f6-960587bf9cb1", name: "Things To Do", emoji: "🎟️" },
  { id: "870d3932-8296-4120-8dde-71159aa2bdf1", name: "Travel & Getaways", emoji: "✈️" },
  { id: "909fc5df-6473-4a39-99e9-c23e665e9288", name: "Health & Fitness", emoji: "🏋️" },
];

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
