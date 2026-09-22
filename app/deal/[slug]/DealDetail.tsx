"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { isDealLive } from "@/lib/dealVisibility";
import { getMapUrl, getDirectionsUrl } from "@/lib/mapLinks";
import CountdownBadge from "@/components/CountdownBadge";
import DealGrid from "@/components/DealGrid";
import ShareButtons from "@/components/ShareButtons";
import { PhoneIcon, MailIcon, GlobeIcon, MapPinIcon, ClockIcon, CalendarIcon } from "@/components/icons";
import { trackDealEvent } from "@/lib/trackDeal";
import { parseBusinessHours, formatBusinessHoursLines, isOpenNow } from "@/lib/businessHours";
import StarRating from "@/components/StarRating";
import Breadcrumbs from "@/components/Breadcrumbs";
import { wixImageUrl } from "@/lib/wixImageUrl";
import { splitTermsForDisplay } from "@/lib/dealTerms";

// The deal (and its related deals) are fetched server-side (see page.tsx)
// so the description, price, and business info are present in the raw
// HTML on first load — this component only adds client-side interactivity
// (view tracking, the "reveal contact info" toggle) on top of real data.
export default function DealDetail({
  deal,
  relatedDeals,
  /** Other live deals from this same business, nearest-relevance first —
   *  see app/deal/[slug]/page.tsx for how this is kept mutually exclusive
   *  with relatedDeals so nothing shows twice on the page. Optional and
   *  defaults to empty for the merchant-portal preview, which has no
   *  other-deals data (and no business page to link to yet). */
  otherBusinessDeals = [],
  /** Rendered inside the merchant's own preview rather than on the public
   *  page. The only difference is that a view isn't recorded: the deal has
   *  no real id yet, and counting the author looking at their own draft
   *  would put fictional traffic in their analytics before the deal
   *  exists. */
  preview = false,
}: {
  deal: Deal;
  relatedDeals: Deal[];
  otherBusinessDeals?: Deal[];
  preview?: boolean;
}) {
  const [showContact, setShowContact] = useState(false);

  // A customer can sit on this exact page for a while — it's the page
  // where they decide to act, not just scroll past. Without re-checking,
  // a deal that expires while the tab is open kept showing a live "Get
  // this deal" button and a working redeem code indefinitely: a fresh page
  // load re-fetches (see app/deal/[slug]/page.tsx's isDealLive check) and
  // 404s once expired, but nothing here ever told an *already-open* tab.
  // Same 30s re-check interval as the category grid and flash deals.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (preview) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [preview]);
  const live = preview || isDealLive(deal, now);

  useEffect(() => {
    if (preview) return;
    trackDealEvent(deal.id, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id, preview]);

  const hasContactInfo = Boolean(
    deal.businessWebsite ||
      deal.businessPhone ||
      deal.businessAddress ||
      deal.businessBookingUrl ||
      deal.businessBookingEmail
  );
  const hasAboutContent = Boolean(
    deal.businessBio ||
      deal.businessHours ||
      deal.businessPriceRange ||
      deal.businessAmenities.length > 0 ||
      deal.businessFacebookUrl ||
      deal.businessInstagramUrl
  );
  const mapUrl = getMapUrl({
    lat: deal.businessLat,
    lng: deal.businessLng,
    address: deal.businessAddress,
    city: deal.businessCity,
  });
  const directionsUrl = getDirectionsUrl({
    lat: deal.businessLat,
    lng: deal.businessLng,
    address: deal.businessAddress,
    city: deal.businessCity,
  });

  const category = deal.categories[0];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          ...(category
            ? [{ name: category, href: `/category/${encodeURIComponent(category)}` }]
            : []),
          { name: deal.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
            {deal.image ? (
              <Image
                src={wixImageUrl(deal.image, 1200, 900)}
                alt={deal.name}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl text-slate-300">
                🏷️
              </div>
            )}
            {live && deal.expiresAt && (
              <div className="absolute bottom-3 left-3 flex gap-2">
                <CountdownBadge target={new Date(deal.expiresAt)} />
              </div>
            )}
          </div>

          <div className="mt-6">
            {/* This is the deal's sales copy, not its conditions. It was
                headed "The fine print", which was wrong even before the
                merchant's actual conditions started rendering — now that
                they do, the page had the two labels the wrong way round. */}
            <h2 className="font-display mb-2 text-lg font-bold text-slate-900">What you get</h2>
            <p className="max-w-none whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {deal.description}
            </p>
          </div>

          {deal.businessName && (hasAboutContent || hasContactInfo) && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h2 className="font-display mb-2 text-lg font-bold text-slate-900">
                About {deal.businessName}
              </h2>
              {deal.businessPriceRange && (
                <p className="mb-2 text-sm font-semibold text-slate-600">
                  {deal.businessPriceRange}
                </p>
              )}
              {deal.businessBio && (
                <p className="text-sm leading-relaxed text-slate-600">{deal.businessBio}</p>
              )}
              {deal.businessAmenities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {deal.businessAmenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
              {deal.businessHours && (() => {
                const parsedHours = parseBusinessHours(deal.businessHours);
                const openNow = parsedHours ? isOpenNow(parsedHours) : null;
                return (
                  <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      {openNow !== null && (
                        <p
                          className={`mb-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                            openNow ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {openNow ? "● Open now" : "Closed now"}
                        </p>
                      )}
                      {parsedHours ? (
                        formatBusinessHoursLines(parsedHours).map((line, i) => <p key={i}>{line}</p>)
                      ) : (
                        <p>{deal.businessHours}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {hasContactInfo && (
                <div className="mt-3 space-y-2">
                  {deal.businessBookingUrl && (
                    <a
                      href={
                        deal.businessBookingUrl.startsWith("http")
                          ? deal.businessBookingUrl
                          : `https://${deal.businessBookingUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className="flex w-fit items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 active:scale-95"
                    >
                      <CalendarIcon className="h-4 w-4" /> Book now
                    </a>
                  )}
                  {deal.businessPhone && (
                    <a
                      href={`tel:${deal.businessPhone.replace(/[^0-9+]/g, "")}`}
                      className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                    >
                      <PhoneIcon className="h-4 w-4 shrink-0" /> {deal.businessPhone}
                    </a>
                  )}
                  {deal.businessBookingEmail && (
                    <a
                      href={`mailto:${deal.businessBookingEmail}`}
                      className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                    >
                      <MailIcon className="h-4 w-4 shrink-0" /> {deal.businessBookingEmail}
                    </a>
                  )}
                  {deal.businessWebsite && (
                    <a
                      href={
                        deal.businessWebsite.startsWith("http")
                          ? deal.businessWebsite
                          : `https://${deal.businessWebsite}`
                      }
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                    >
                      <GlobeIcon className="h-4 w-4 shrink-0" /> Visit website
                    </a>
                  )}
                  {deal.businessAddress && (
                    <div className="text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 shrink-0" /> {deal.businessAddress}
                        {deal.businessCity ? `, ${deal.businessCity}` : ""}
                      </p>
                      {(mapUrl || directionsUrl) && (
                        <p className="mt-1 flex items-center gap-3 pl-6 text-xs font-semibold text-brand-700">
                          {mapUrl && (
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              View map
                            </a>
                          )}
                          {directionsUrl && (
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              Get directions
                            </a>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(deal.businessFacebookUrl || deal.businessInstagramUrl) && (
                <div className="mt-3 flex items-center gap-3 text-sm">
                  {deal.businessFacebookUrl && (
                    <a
                      href={deal.businessFacebookUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      Facebook
                    </a>
                  )}
                  {deal.businessInstagramUrl && (
                    <a
                      href={deal.businessInstagramUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      Instagram
                    </a>
                  )}
                </div>
              )}
              {deal.businessSlug && (
                <Link
                  href={`/business/${deal.businessSlug}`}
                  className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline"
                >
                  View full business profile →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* NOTE: on a phone this whole panel — the price and the only
            booking button on the page — stacks below the photo, the
            description and the entire business section. Ordering it first
            was tried and is worse: the page then opens on a text card and
            the photo, which is what sells the deal, drops below it. Doing
            it properly means photo, then price, then the rest, which needs
            the photo lifted out into its own grid item, and that risks the
            sticky behaviour of this panel on desktop. Left as it was
            deliberately, not overlooked. */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            {deal.categories[0] && (
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {deal.categories[0]}
              </span>
            )}
            <h1 className="font-display mt-1 text-2xl font-bold leading-snug text-slate-900">
              {deal.name}
            </h1>
            {deal.businessName && (
              <Link
                href={deal.businessSlug ? `/business/${deal.businessSlug}` : "#"}
                className="mt-2 flex items-center gap-2 group/business"
              >
                {deal.businessLogoUrl ? (
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    <Image
                      src={wixImageUrl(deal.businessLogoUrl, 64, 64)}
                      alt={deal.businessName}
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <span aria-hidden className="text-lg">
                    🏪
                  </span>
                )}
                <span className="text-sm font-semibold text-slate-700 group-hover/business:text-brand-700 group-hover/business:underline">
                  by {deal.businessName}
                </span>
              </Link>
            )}
            <StarRating rating={deal.businessRating} reviewCount={deal.businessReviewCount} className="mt-1" />

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900">
                {formatMoney(deal.now, deal.currency, deal.formattedNow)}
              </span>
              {deal.was > deal.now && (
                <>
                  <span className="text-lg text-slate-500 line-through">
                    {formatMoney(deal.was, deal.currency, deal.formattedWas)}
                  </span>
                  <span className="rounded-full bg-ember-50 px-2 py-0.5 text-sm font-bold text-ember-600">
                    {deal.discountPercent}% off
                  </span>
                </>
              )}
              {deal.inStock &&
                deal.quantityAvailable !== null &&
                deal.quantityAvailable > 0 &&
                deal.quantityAvailable <= 5 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-sm font-bold text-red-600">
                    Only {deal.quantityAvailable} left
                  </span>
                )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Price paid directly to {deal.businessName || "the business"} — MegaDeal
              doesn&apos;t process any payment. Offered directly by the
              business, subject to availability and while supplies last —
              MegaDeal is the advertiser, not a party to your booking. See our{" "}
              <Link href="/terms" className="underline hover:text-slate-500">
                terms
              </Link>
              .
            </p>

            {/* The merchant's own conditions. Collected since deals began
                and never shown until now, which meant a customer's first
                encounter with "bookings essential" or "valid Monday to
                Thursday" was being turned away — the one place those
                sentences exist to prevent. Above the booking buttons
                deliberately: after them it is an excuse, before them it is
                information. */}
            {deal.terms && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Good to know
                </p>
                {/* Was one dense paragraph — deal.terms is usually several
                    distinct conditions run together ("Bookings essential.
                    Valid Monday to Thursday only. Ask for the MegaDeal
                    rate."), which reads as a wall of text when a customer
                    is scanning for the one line that actually affects
                    them. Each condition already has its own sentence
                    boundary (see lib/dealTerms.ts), so splitting on that
                    to give each one its own bullet costs nothing and
                    scans in a fraction of the time. */}
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-slate-600">
                  {splitTermsForDisplay(deal.terms).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hidden while previewing: ShareButtons defaults to the
                current URL, which here is the merchant's own auth-gated
                /portal/new-deal page — a link that would be useless to
                anyone they sent it to. */}
            {!preview && <ShareButtons title={deal.name} size="md" className="mt-4" />}

            <div className="mt-6">
              {!live ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm font-bold text-slate-500">
                  This deal has ended
                </div>
              ) : !deal.inStock ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm font-bold text-slate-500">
                  Sold out — check back soon
                </div>
              ) : !showContact ? (
                <button
                  onClick={() => {
                    // Same reasoning as the view effect above: a preview
                    // has no real deal id, so recording a click would put
                    // fictional demand in the merchant's own analytics.
                    if (!preview) trackDealEvent(deal.id, "click");
                    setShowContact(true);
                  }}
                  className="w-full rounded-full bg-ember-600 py-3 text-center font-bold text-white shadow-card transition hover:bg-ember-700 active:scale-95"
                >
                  Get this deal
                </button>
              ) : (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-800">
                    Mention this MegaDeal offer when you contact or visit{" "}
                    {deal.businessName || "the business"} to redeem it.
                  </p>
                  {deal.dealCode && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-brand-800">
                      Quote code{" "}
                      <span className="rounded-md bg-white px-2 py-0.5 font-mono font-bold tracking-wide text-brand-700 shadow-sm">
                        {deal.dealCode}
                      </span>
                    </p>
                  )}
                  {hasContactInfo && (
                    <p className="mt-1 text-xs text-brand-700">
                      Full contact details are in the &quot;About{" "}
                      {deal.businessName || "this business"}&quot; section below.
                    </p>
                  )}
                  {deal.businessSlug && (
                    <Link
                      href={`/business/${deal.businessSlug}`}
                      className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline"
                    >
                      View full business profile →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* The question this site never answered.
                
                Nothing is bought here: there is no voucher, no receipt and
                no checkout, so a customer weighing up a deal has nothing to
                wave at the counter and no idea what happens if the business
                shrugs. The panel above says what to do to redeem — but only
                after "Get this deal" is pressed, which is after the moment
                of doubt, not during it. This sits under the button, always
                visible, and says the same three things on every deal.

                Every line is something that is actually true: deals are
                created as "Pending Approval" and only an admin moves them
                live (app/api/deals/create), payment is direct to the
                business by design, and the report link goes somewhere that
                exists and arrives naming this deal. Nothing here promises
                an outcome MegaDeal cannot deliver — no refund, no
                guarantee, no cover. It says what is real, which for an
                unfamiliar site is worth more than a badge. */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                How MegaDeal works
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
                <li>
                  🎟️ <span className="font-semibold text-slate-700">Nothing to buy here.</span> You pay{" "}
                  {deal.businessName || "the business"} directly at the deal price.
                </li>
                <li>
                  ✅ <span className="font-semibold text-slate-700">We check every deal</span> before it
                  goes live.
                </li>
                <li>
                  🛟 Deal not honoured?{" "}
                  {preview ? (
                    <span className="font-semibold text-brand-700">Tell us</span>
                  ) : (
                    <Link
                      href={`/contact?deal=${encodeURIComponent(deal.slug)}`}
                      className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                    >
                      Tell us
                    </Link>
                  )}{" "}
                  and we&apos;ll look into it.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {otherBusinessDeals.length > 0 && (
        <div className="mt-10 border-t border-slate-100 pt-8">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-slate-900">
              More deals from {deal.businessName}
            </h2>
            {deal.businessSlug && (
              <Link href={`/business/${deal.businessSlug}`} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            )}
          </div>
          <DealGrid deals={otherBusinessDeals} />
        </div>
      )}

      {relatedDeals.length > 0 && (
        <div className="mt-10 border-t border-slate-100 pt-8">
          <h2 className="font-display mb-5 text-xl font-bold text-slate-900">You might also like</h2>
          <DealGrid deals={relatedDeals} />
        </div>
      )}
    </main>
  );
}
