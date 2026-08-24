export type DealStatus = "Pending Approval" | "Live" | "Paused" | "Cancelled";

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
  status: DealStatus | null;
  businessName: string | null;
  businessLogoUrl: string | null;
  businessWebsite: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  businessCity: string | null;
}
