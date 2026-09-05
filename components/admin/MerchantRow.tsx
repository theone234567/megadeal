import Link from "next/link";

export interface AdminMerchant {
  _id: string;
  _owner?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  couponCode?: string;
  creditsBalance?: number;
  status?: string;
  logoUrl?: string;
  bio?: string;
  businessHours?: string;
  bookingUrl?: string;
  bookingEmail?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  priceRange?: string;
  amenities?: string;
  emailVerified?: boolean;
  lat?: number;
  lng?: number;
  rating?: number | null;
  reviewCount?: number | null;
  referralCode?: string;
  referredBy?: string;
  referralRewarded?: boolean;
  promoRewarded?: boolean;
  notifyReferralBonus?: boolean;
  website?: string;
  contactName?: string;
  contactPhone?: string;
  legalBusinessName?: string;
  nzbn?: string;
  [key: string]: any;
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-green-50 text-green-700",
  Suspended: "bg-red-50 text-red-700",
};

/**
 * Compact summary row — the full detail (every field, plus the
 * approve/pending/suspend controls) lives on its own page now
 * (/admin/businesses/[id]), so this just needs to be enough to recognize
 * the business and jump to it.
 */
export default function MerchantRow({ merchant }: { merchant: AdminMerchant }) {
  const status = merchant.status || "Pending";

  return (
    <tr className="border-b border-slate-100 align-top transition hover:bg-slate-50">
      <td className="py-3 pr-4">
        <Link href={`/admin/businesses/${merchant._id}`} className="flex items-center gap-2">
          {merchant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={merchant.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
              🏪
            </span>
          )}
          <div>
            <p className="font-semibold text-brand-700 hover:underline">
              {merchant.businessName || "—"}
            </p>
            <p className="text-xs text-slate-400">{merchant.email}</p>
            {merchant.legalBusinessName && (
              <p className="text-xs text-slate-400">
                Legal name: <span className="font-medium text-slate-600">{merchant.legalBusinessName}</span>
              </p>
            )}
            {!merchant.emailVerified && (
              <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                ⏳ Email pending verification
              </p>
            )}
            {!merchant._owner && (
              <p className="mt-0.5 text-xs font-semibold text-amber-700">
                ⚠️ Unclaimed
              </p>
            )}
          </div>
        </Link>
      </td>
      <td className="py-3 pr-4 text-xs text-slate-500">
        {[merchant.address, merchant.city, merchant.postcode].filter(Boolean).join(", ") || "—"}
        <br />
        {merchant.phone}
      </td>
      <td className="py-3 pr-4 text-xs font-semibold text-slate-600">
        {merchant.couponCode || "—"}
      </td>
      <td className="py-3 pr-4 text-sm font-semibold text-slate-700">
        {merchant.creditsBalance ?? 0}
      </td>
      <td className="py-3 pr-4">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600"}`}>
          {status}
        </span>
      </td>
      <td className="py-3 pr-4 text-right">
        <Link
          href={`/admin/businesses/${merchant._id}`}
          className="text-sm font-semibold text-brand-600 hover:underline"
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
