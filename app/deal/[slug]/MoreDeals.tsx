import Link from "next/link";
import DealGrid from "@/components/DealGrid";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import type { Deal } from "@/lib/types";

/**
 * The two lists under a deal: this business's other deals, then "You
 * might also like". They need every live deal on the site, which on a
 * cold server is the slowest read on the page — so page.tsx renders this
 * inside its own Suspense boundary and the deal itself shows without
 * waiting for it. Rendered on the server, so the links are still in the
 * HTML crawlers get.
 */
export default async function MoreDeals({ deal }: { deal: Deal }) {
  const allDeals = await fetchAllLiveDealsServer();
  const others = allDeals.filter((d) => d.id !== deal.id);

  // Same business first: someone who liked this deal is often more
  // interested in this specific business's other offers than in a
  // same-category deal from a stranger. Capped higher than "you might
  // also like" below since it's the more relevant list.
  const otherBusinessDeals = deal.businessSlug
    ? others.filter((d) => d.businessSlug === deal.businessSlug).slice(0, 8)
    : [];
  const otherBusinessDealIds = new Set(otherBusinessDeals.map((d) => d.id));

  // "You might also like" fills in with same-category deals from OTHER
  // businesses — excluding anything already shown above so the same deal
  // never appears twice on the page.
  const remainingOthers = others.filter((d) => !otherBusinessDealIds.has(d.id));
  const sameCategory = remainingOthers.filter((d) => d.categories.some((c) => deal.categories.includes(c)));
  const relatedDeals = (sameCategory.length > 0 ? sameCategory : remainingOthers).slice(0, 4);

  return (
    <>
      {otherBusinessDeals.length > 0 && (
        <div className="mt-12 border-t border-slate-100 pt-8">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-slate-900">More deals from {deal.businessName}</h2>
            {deal.businessSlug && (
              <Link
                href={`/business/${deal.businessSlug}`}
                prefetch={false}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                View all →
              </Link>
            )}
          </div>
          <DealGrid deals={otherBusinessDeals} />
        </div>
      )}

      {relatedDeals.length > 0 && (
        <div className="mt-12 border-t border-slate-100 pt-8">
          <h2 className="font-display mb-5 text-xl font-bold text-slate-900">You might also like</h2>
          <DealGrid deals={relatedDeals} />
        </div>
      )}
    </>
  );
}
