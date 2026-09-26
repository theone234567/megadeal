"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney, formatOfferEndDate } from "@/lib/format";
import { dealSaving, dealSavingPercent } from "@/lib/dealSaving";
import { isDealLive } from "@/lib/dealVisibility";
import { getMapUrl, getDirectionsUrl } from "@/lib/mapLinks";
import CountdownBadge from "@/components/CountdownBadge";
import DealGrid from "@/components/DealGrid";
import ShareButtons from "@/components/ShareButtons";
import {
  PhoneIcon,
  MailIcon,
  GlobeIcon,
  MapPinIcon,
  ClockIcon,
  CalendarIcon,
  ZapIcon,
} from "@/components/icons";
import { trackDealEvent } from "@/lib/trackDeal";
import { parseBusinessHours, formatBusinessHoursLines, isOpenNow } from "@/lib/businessHours";
import Breadcrumbs from "@/components/Breadcrumbs";
import { wixImageUrl } from "@/lib/wixImageUrl";
import { keyRestrictions, splitTermsForDisplay } from "@/lib/dealTerms";
import { CATEGORIES, categoryPath } from "@/lib/categories";

function externalHref(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

// The deal (and its related deals) are fetched server-side (see page.tsx)
// so the description, price, and business info are present in the raw
// HTML on first load — this component only adds client-side interactivity
// (view tracking, the code reveal) on top of real data.
//
// Layout: title, photo, price/action, what's included, business — as
// independent grid items in that DOM order, so a phone reads (and a
// keyboard or screen reader moves through) them in exactly that sequence.
// The old layout nested the photo, description and whole business section
// in one column ahead of the price panel, which put the price and the only
// action on the page several screens down on a phone. On desktop the same
// items are placed into two columns, with the action panel beside them.
//
// Not shown, though the Deal type carries them: businessRating (typed in
// by an admin, not aggregated customer reviews) and quantityAvailable (set
// once at creation and never decremented, so "Only 3 left" would be a
// fixed number presented as live scarcity).
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
  const [showCode, setShowCode] = useState(false);

  // A customer can sit on this exact page for a while — it's the page
  // where they decide to act, not just scroll past. Without re-checking,
  // a deal that expires while the tab is open kept showing a live action
  // and a working code indefinitely: a fresh page load re-fetches (see
  // app/deal/[slug]/page.tsx's isDealLive check) and 404s once expired,
  // but nothing here ever told an *already-open* tab. Same 30s re-check
  // interval as the category grid and flash deals.
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
  const categoryEmoji = CATEGORIES.find((c) => c.name === category)?.emoji ?? "🏷️";
  const businessLabel = deal.businessName || "the business";
  const saving = dealSaving(deal.was, deal.now);
  const savingPct = dealSavingPercent(deal.was, deal.now);
  const restrictions = keyRestrictions(deal.terms);
  const conditions = deal.terms ? splitTermsForDisplay(deal.terms) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Breadcrumbs
        items={[
          ...(category ? [{ name: category, href: categoryPath(category) }] : []),
          { name: deal.name },
        ]}
      />

      {/* 1. Title and business */}
      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          {deal.isFlash && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-1 text-xs font-extrabold text-white">
              <ZapIcon className="h-3.5 w-3.5" /> Flash Deal
            </span>
          )}
          {category && (
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-brand-600">{category}</span>
          )}
        </div>
        <h1 className="font-display mt-2 text-[1.75rem] font-semibold leading-tight text-slate-900 sm:text-[1.875rem] lg:text-[2.25rem]">
          {deal.name}
        </h1>
        {(deal.businessName || deal.businessCity) && (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {deal.businessName && (
              <span className="inline-flex items-center gap-2">
                {deal.businessLogoUrl && (
                  <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    <Image
                      src={wixImageUrl(deal.businessLogoUrl, 64, 64)}
                      alt=""
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  </span>
                )}
                {/* Only a link when there's a profile to go to — this used
                    to fall back to href="#", a link that looked real and
                    went nowhere. */}
                {deal.businessSlug ? (
                  <Link
                    href={`/business/${deal.businessSlug}`}
                    className="font-semibold text-slate-800 underline-offset-2 hover:text-brand-700 hover:underline"
                  >
                    {deal.businessName}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-800">{deal.businessName}</span>
                )}
              </span>
            )}
            {deal.businessCity && (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <MapPinIcon className="h-4 w-4 shrink-0" /> {deal.businessCity}
              </span>
            )}
          </p>
        )}
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-10 lg:gap-y-10">
        {/* 2. Photo */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-brand-50">
            {deal.image ? (
              <Image
                src={wixImageUrl(deal.image, 1200, 900)}
                alt={deal.name}
                fill
                sizes="(min-width: 1024px) 680px, 100vw"
                className="object-cover"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <div aria-hidden className="flex h-full w-full items-center justify-center text-7xl opacity-40">
                {categoryEmoji}
              </div>
            )}
          </div>
        </div>

        {/* 3. Price, key conditions and the action */}
        <aside
          aria-label="Price and deal code"
          // Deliberately not sticky: the site header is sticky and ~120px
          // tall, and this panel is ~680px (taller once the code is
          // revealed), so a sticky panel either tucked its price under the
          // header or, offset below it, cut its own bottom — the report
          // link included — off on a laptop-height screen.
          className="lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start"
        >
          <div className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[2.875rem] font-extrabold leading-none tracking-tight text-brand-700">
                {formatMoney(deal.now, deal.currency, deal.formattedNow)}
              </span>
              {deal.was > deal.now && (
                <span className="text-lg font-medium text-slate-500 line-through">
                  <span className="sr-only">Usual price </span>
                  {formatMoney(deal.was, deal.currency, deal.formattedWas)}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {saving !== null && savingPct !== null && (
                <>
                  <span className="font-bold text-ember-600">
                    Save {formatMoney(saving, deal.currency)} ({savingPct}%)
                  </span>
                  {" · "}
                </>
              )}
              Paid to {businessLabel} in {deal.currency || "NZD"}
            </p>

            {deal.expiresAt && (
              <div className="mt-4 rounded-xl bg-brand-50 px-3.5 py-3">
                {deal.isFlash && live && (
                  <div className="mb-1.5">
                    <CountdownBadge target={new Date(deal.expiresAt)} variant="offer" />
                  </div>
                )}
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">{live ? "Offer ends" : "Offer ended"}</span>{" "}
                  {formatOfferEndDate(deal.expiresAt, true)}
                </p>
                {live && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    The deadline to get the deal, not the days you can use it.
                  </p>
                )}
              </div>
            )}

            {conditions.length > 0 && (
              <div className="mt-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Before you book</h2>
                {restrictions.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {restrictions.map((r) => (
                      <li key={r} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
                <a
                  href="#conditions"
                  className="mt-2 inline-block text-sm font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  {restrictions.length > 0 ? "Read the full conditions" : "Check the conditions before you book"}
                </a>
              </div>
            )}

            <div className="mt-5" aria-live="polite">
              {!live ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-slate-600">This offer has ended</p>
                  <p className="mt-0.5 text-xs text-slate-500">It can no longer be claimed through MegaDeal.</p>
                </div>
              ) : !deal.inStock ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm font-bold text-slate-600">
                  Sold out — check back soon
                </div>
              ) : !showCode ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      // Same reasoning as the view effect above: a preview
                      // has no real deal id, so recording a click would put
                      // fictional demand in the merchant's own analytics.
                      if (!preview) trackDealEvent(deal.id, "click");
                      setShowCode(true);
                    }}
                    className="flex min-h-12 w-full items-center justify-center rounded-full bg-brand-600 px-5 text-base font-bold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 active:scale-[0.98]"
                  >
                    {deal.dealCode ? "Get deal code" : "Show how to book"}
                  </button>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    {deal.dealCode ? "Free to get the code" : "Free"} · No payment to MegaDeal
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                  {deal.dealCode ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Your deal code</p>
                      <p className="mt-1 select-all font-mono text-2xl font-extrabold tracking-wider text-brand-800">
                        {deal.dealCode}
                      </p>
                      <p className="mt-1 text-sm text-brand-900">
                        Quote this code when you contact {businessLabel}.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-brand-900">
                      Mention this MegaDeal offer when you contact {businessLabel}.
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    {deal.businessBookingUrl && (
                      <a
                        href={externalHref(deal.businessBookingUrl)}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-bold text-white transition hover:bg-brand-700"
                      >
                        <CalendarIcon className="h-4 w-4" /> Book with the business ↗
                      </a>
                    )}
                    {deal.businessPhone && (
                      <a
                        href={`tel:${deal.businessPhone.replace(/[^0-9+]/g, "")}`}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 transition hover:border-brand-400"
                      >
                        <PhoneIcon className="h-4 w-4" /> Call {deal.businessPhone}
                      </a>
                    )}
                    {deal.businessBookingEmail && (
                      <a
                        href={`mailto:${deal.businessBookingEmail}`}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 transition hover:border-brand-400"
                      >
                        <MailIcon className="h-4 w-4" /> Email to book
                      </a>
                    )}
                    {!deal.businessBookingUrl && deal.businessWebsite && (
                      <a
                        href={externalHref(deal.businessWebsite)}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 transition hover:border-brand-400"
                      >
                        <GlobeIcon className="h-4 w-4" /> Visit their website ↗
                      </a>
                    )}
                    {!deal.businessBookingUrl &&
                      !deal.businessPhone &&
                      !deal.businessBookingEmail &&
                      !deal.businessWebsite &&
                      deal.businessAddress && (
                        <p className="text-sm text-brand-900">
                          Visit them at {deal.businessAddress}
                          {deal.businessCity ? `, ${deal.businessCity}` : ""}.
                        </p>
                      )}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-brand-900/80">
                    A code doesn&apos;t reserve a booking — {businessLabel} confirms your booking and
                    availability directly.
                  </p>
                </div>
              )}
            </div>

            {/* Hidden while previewing: ShareButtons defaults to the
                current URL, which here is the merchant's own auth-gated
                /portal/new-deal page — a link that would be useless to
                anyone they sent it to. */}
            {!preview && <ShareButtons title={deal.name} size="md" className="mt-5" />}

            {/* Always visible, not only after the code is revealed: this
                answers "what am I getting into?" at the moment of doubt,
                before the button. Every line is true — deals are created
                as "Pending Approval" and only an admin moves them live
                (app/api/deals/create), payment is direct to the business
                by design, and the report link goes somewhere that exists
                and arrives naming this deal. */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">How MegaDeal works</p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
                <li>
                  🎟️ <span className="font-semibold text-slate-700">Nothing to buy here.</span> You pay{" "}
                  {businessLabel} directly at the deal price.
                </li>
                <li>
                  ✅ <span className="font-semibold text-slate-700">We check every deal</span> before it goes
                  live.
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
        </aside>

        {/* 4. What's included and the complete conditions */}
        <section className="lg:col-start-1 lg:row-start-2">
          <h2 className="font-display text-xl font-semibold text-slate-900">What&apos;s included</h2>
          <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-relaxed text-slate-700">{deal.description}</p>

          {conditions.length > 0 && (
            <div id="conditions" className="mt-8 scroll-mt-24">
              <h2 className="font-display text-xl font-semibold text-slate-900">Full conditions</h2>
              {/* Every condition exactly as the business wrote it, one per
                  line (see lib/dealTerms.ts) — the "Before you book"
                  summary only ever shortens standard checkbox conditions,
                  so this is where anything custom is read. */}
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-slate-700">
                {conditions.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            Price paid directly to {businessLabel} — MegaDeal doesn&apos;t process any payment. Offered directly by
            the business, subject to availability and while supplies last — MegaDeal is the advertiser, not a party
            to your booking. See our{" "}
            <Link href="/terms" className="underline hover:text-slate-600">
              terms
            </Link>
            .
          </p>
        </section>

        {/* 5. The business */}
        {deal.businessName && (hasAboutContent || hasContactInfo) && (
          <section className="border-t border-slate-100 pt-8 lg:col-start-1 lg:row-start-3">
            <h2 className="font-display text-xl font-semibold text-slate-900">About {deal.businessName}</h2>
            {deal.businessPriceRange && (
              <p className="mt-2 text-sm font-semibold text-slate-600">{deal.businessPriceRange}</p>
            )}
            {deal.businessBio && (
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-700">{deal.businessBio}</p>
            )}
            {deal.businessAmenities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {deal.businessAmenities.map((a) => (
                  <span key={a} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {a}
                  </span>
                ))}
              </div>
            )}
            {deal.businessHours &&
              (() => {
                const parsedHours = parseBusinessHours(deal.businessHours);
                const openNow = parsedHours ? isOpenNow(parsedHours) : null;
                return (
                  <div className="mt-4 flex items-start gap-2 text-sm text-slate-600">
                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      {/* Labelled explicitly: these are the business's
                          opening hours, which are not the same as the times
                          this particular deal can be used. */}
                      <p className="font-semibold text-slate-700">Opening hours</p>
                      {openNow !== null && (
                        <p
                          className={`my-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
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
              <div className="mt-4 space-y-2">
                {deal.businessBookingUrl && (
                  <a
                    href={externalHref(deal.businessBookingUrl)}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                  >
                    <CalendarIcon className="h-4 w-4 shrink-0" /> Online booking
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
                    href={externalHref(deal.businessWebsite)}
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
                          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
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
                className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
              >
                View full business profile →
              </Link>
            )}
          </section>
        )}
      </div>

      {otherBusinessDeals.length > 0 && (
        <div className="mt-12 border-t border-slate-100 pt-8">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-slate-900">More deals from {deal.businessName}</h2>
            {deal.businessSlug && (
              <Link
                href={`/business/${deal.businessSlug}`}
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
    </main>
  );
}
