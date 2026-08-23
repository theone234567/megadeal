export interface Deal {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string | null;
  now: number;
  was: number;
  formattedNow: string | null;
  formattedWas: string | null;
  discountPercent: number;
  currency: string;
  ribbon: string | null;
  categories: string[];
  variantId: string | null;
  inStock: boolean;
  expiresAt: string | null;
}
