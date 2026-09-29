import Link from "next/link";
import type { ReactNode } from "react";
import type { Deal } from "@/lib/types";
import { formatOfferEndDate } from "@/lib/format";
import { placeLabel } from "@/lib/location";
import { wixImageSrcSet, wixImageUrl } from "@/lib/wixImageUrl";
import { ArrowRightIcon, MapPinIcon } from "@/components/icons";

/**
 * What an old link to a deal shows once the deal is over — shared on
 * Facebook or WhatsApp, bookmarked, or clicked in a search result Google
 * hasn't dropped yet. The page used to be the generic "not found"; now it
 * says what happened and offers the business's current deals and similar
 * ones (the `moreDeals` slot, MoreDeals.tsx), so the visit isn't wasted.
 *
 * Nothing here can be used: no price, deal code or booking buttons. The
 * page is noindex (see generateMetadata in page.tsx) so search engines drop
 * it, as they did the not-found page.
 */
export default function EndedDeal({ deal, moreDeals }: { deal: Deal; moreDeals: ReactNode }) {
  const now = Date.now();
  const expired = Boolean(deal.expiresAt && new Date(deal.expiresAt).getTime() <= now);
  const place = placeLabel(deal.businessSuburb, deal.businessCity);
  const status = expired
    ? `This deal ended on ${formatOfferEndDate(deal.expiresAt!, false)}.`
    : "This deal isn’t available right now.";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section
        aria-labelledby="ended-deal-heading"
        className="grid grid-cols-1 overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-card sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
      >
        <div className="relative aspect-[4/3] w-full bg-brand-50 sm:aspect-auto sm:min-h-[240px]">
          {deal.image && (
            // Greyed out: it's a record of the deal, not an offer.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wixImageUrl(deal.image, 900, 675)}
              srcSet={wixImageSrcSet(deal.image, [480, 900], 4 / 3)}
              sizes="(min-width: 640px) 40vw, 100vw"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70 grayscale"
            />
          )}
        </div>

        <div className="p-6 sm:p-8">
          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
            {expired ? "Deal ended" : "Not available"}
          </span>
          <h1 id="ended-deal-heading" className="font-display mt-3 text-2xl font-semibold leading-tight text-slate-900 sm:text-[1.75rem]">
            {deal.name}
          </h1>
          {(deal.businessName || place) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {deal.businessName &&
                (deal.businessSlug ? (
                  <Link
                    href={`/business/${deal.businessSlug}`}
                    prefetch={false}
                    className="font-bold text-slate-900 underline-offset-2 hover:text-brand-700 hover:underline"
                  >
                    {deal.businessName}
                  </Link>
                ) : (
                  <span className="font-bold text-slate-900">{deal.businessName}</span>
                ))}
              {place && (
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPinIcon className="h-3.5 w-3.5" /> {place}
                </span>
              )}
            </p>
          )}

          <p className="mt-4 text-base leading-relaxed text-slate-700">
            {status} Take a look at what&rsquo;s on now instead.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {deal.businessSlug && (
              <Link href={`/business/${deal.businessSlug}`} prefetch={false} className="btn-primary">
                {/* The name is right above; repeating it made the button
                    wrap onto two lines on a phone. */}
                See their current deals
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
            <Link href="/" className="btn-secondary">
              Browse all deals
            </Link>
          </div>
        </div>
      </section>

      {moreDeals}
    </main>
  );
}
