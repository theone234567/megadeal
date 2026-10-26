import Link from "next/link";
import DealGrid from "@/components/DealGrid";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import type { Deal } from "@/lib/types";
import { moreDealsFor } from "@/lib/moreDeals";

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
  // Which deals, and in what order (lib/moreDeals.ts).
  const { fromBusiness: otherBusinessDeals, related: relatedDeals } = moreDealsFor(deal, allDeals);

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
