"use client";

import { DEFAULT_CITY, cityPath } from "@/lib/cities";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney, formatOfferEndDate } from "@/lib/format";
import { dealSaving, dealSavingPercent } from "@/lib/dealSaving";
import { isDealLive } from "@/lib/dealVisibility";
import { getDirectionsUrl } from "@/lib/mapLinks";
import CountdownBadge from "@/components/CountdownBadge";
import ShareButtons from "@/components/ShareButtons";
import ContactBusiness from "./ContactBusiness";
import AboutBusiness from "./AboutBusiness";
import { CalendarIcon } from "@/components/icons";
import { trackDealEvent } from "@/lib/trackDeal";
import { useDealActionTracker } from "@/lib/useDealActionTracker";
import Breadcrumbs from "@/components/Breadcrumbs";
import { wixImageSrcSet, wixImageUrl } from "@/lib/wixImageUrl";
import { placeLabel } from "@/lib/location";
import { keyRestrictions, splitTermsForDisplay } from "@/lib/dealTerms";
import DealConditions from "@/components/DealConditions";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import {
  contactInstruction,
  contactOptions,
  effectiveBookingRequirement,
  termsSayWalkInsWelcome,
  websiteCodeHref,
} from "@/lib/booking";

// The deal is fetched server-side (see page.tsx), so the description,
// price, conditions and business details are in the raw HTML on first
// load — this component only adds interactivity (view tracking, copying
// the code, the Contact business pop-up) on top of real data.
//
// Deal first, business second. In DOM order: title, photo, price and the
// one action, what's included, key conditions, then About the business —
// so a phone (and a keyboard or screen reader) reads them in exactly that
// order. On desktop the price panel sits beside the photo.
//
// The one action is "Contact business" (ContactBusiness.tsx): every way to
// reach the business is in its pop-up, from the business profile; the
// deal's booking requirement (lib/booking.ts) only changes the sentence
// under it. A missing booking link never reads as "no booking needed".
//
// Not shown, though the Deal type carries them: businessRating (typed in
// by an admin, not aggregated customer reviews) and quantityAvailable (set
// once at creation and never decremented, so "Only 3 left" would be a
// fixed number presented as live scarcity).
export default function DealDetail({
  deal,
  /** "More deals from this business" and "You might also like", built on
   *  the server (see MoreDeals.tsx) and streamed in after the deal itself.
   *  Left out in the admin and merchant previews. */
  moreDeals = null,
  /** The merchant's (or admin's) preview: the same page, but nothing is
   *  tracked and no contact link goes anywhere. */
  preview = false,
}: {
  deal: Deal;
  moreDeals?: ReactNode;
  preview?: boolean;
}) {
  // A customer can sit on this page a while; re-check every 30s so a deal
  // that ends while the tab is open stops offering its code and action.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (preview) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [preview]);
  const live = preview || isDealLive(deal, now);

  const tracker = useDealActionTracker(deal.id, preview);

  useEffect(() => {
    if (preview) return;
    trackDealEvent(deal.id, "view");
  }, [deal.id, preview]);

  const category = deal.categories[0];
  const categoryEmoji = CATEGORIES.find((c) => c.name === category)?.emoji ?? "🏷️";
  const businessLabel = deal.businessName || "the business";
  const saving = dealSaving(deal.was, deal.now);
  const savingPct = dealSavingPercent(deal.was, deal.now);
  const place = placeLabel(deal.businessSuburb, deal.businessCity);

  // Key conditions: the short forms of the standard ones, or (when there
  // are none) the business's own first lines as written, never paraphrased.
  const restrictions = keyRestrictions(deal.terms);
  const conditions = deal.terms ? splitTermsForDisplay(deal.terms) : [];
  const keyLines = restrictions.length > 0 ? restrictions : conditions.slice(0, 3);
  // "Full conditions" only when it adds something: a condition not already
  // shown word for word above.
  const shown = new Set(keyLines.map((l) => l.toLowerCase()));
  const moreInFull = conditions.some((c) => !shown.has(c.toLowerCase()));
  const endLine = deal.expiresAt && !deal.isFlash ? `${live ? "Offer ends" : "Offer ended"} ${formatOfferEndDate(deal.expiresAt)}` : null;

  const requirement = effectiveBookingRequirement(deal.bookingRequirement, deal.terms);
  const codeLink = websiteCodeHref(deal);
  // Directions only to a real, public place: never for a home-based or
  // mobile business, whose street is private and pin only approximate.
  const hasPlace =
    !deal.businessAddressHidden &&
    Boolean(deal.businessAddress || (deal.businessLat != null && deal.businessLng != null));
  const streetLine =
    deal.businessAddress &&
    deal.businessSuburb &&
    !deal.businessAddress.toLowerCase().includes(deal.businessSuburb.toLowerCase())
      ? `${deal.businessAddress}, ${deal.businessSuburb}`
      : deal.businessAddress;
  const directionsUrl = hasPlace
    ? getDirectionsUrl({ lat: deal.businessLat, lng: deal.businessLng, address: streetLine, city: deal.businessCity })
    : null;
  const options = contactOptions({
    requirement,
    businessName: deal.businessName,
    dealName: deal.name,
    dealCode: deal.dealCode,
    phone: deal.businessPhone,
    email: deal.businessBookingEmail,
    website: deal.businessWebsite,
    bookingUrl: deal.businessBookingUrl,
    codeWebsiteUrl: codeLink,
    directionsUrl,
    addressText: hasPlace ? streetLine : null,
  });
  const instruction = contactInstruction(requirement, deal.dealCode, {
    walkIns: termsSayWalkInsWelcome(deal.terms),
    websiteCode: Boolean(codeLink),
  });
  const profileHref = deal.businessSlug && !preview ? `/business/${deal.businessSlug}` : null;

  return (
    <main className="mx-auto max-w-[1040px] px-4 py-6 sm:px-6 lg:py-8">
      <Breadcrumbs
        items={[{ name: DEFAULT_CITY.name, href: cityPath() }, ...(category ? [{ name: category, href: categoryPath(category) }] : []), { name: deal.name }]}
      />

      {/* 1. Title and business */}
      <header className="mt-4">
        {deal.isFlash ? (
          <span className="inline-block rounded-full bg-brand-600 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
            Flash Deal
          </span>
        ) : (
          category && (
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-brand-700">{category}</span>
          )
        )}
        <h1 className="mt-1.5 text-balance font-display text-[1.75rem] font-semibold leading-tight text-slate-900 sm:text-[2rem] lg:text-[2.25rem]">
          {deal.name}
        </h1>
        {(deal.businessName || place) && (
          <p className="mt-1.5 text-sm text-slate-600">
            {deal.businessName &&
              // Only a link when there's a profile to go to.
              (profileHref ? (
                <Link
                  href={profileHref}
                  prefetch={false}
                  className="font-bold text-slate-900 underline-offset-2 hover:text-brand-700 hover:underline"
                >
                  {deal.businessName}
                </Link>
              ) : (
                <span className="font-bold text-slate-900">{deal.businessName}</span>
              ))}
            {deal.businessName && place && <span aria-hidden="true"> · </span>}
            {place}
          </p>
        )}
      </header>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:mt-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)] lg:gap-x-9 lg:gap-y-8">
        {/* 2. Photo: always 4:3, whatever shape was uploaded. */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-brand-50">
            {deal.image ? (
              // A plain <img>: next/image makes no srcset while images are
              // unoptimized, and this lets a phone take a smaller copy.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={wixImageUrl(deal.image, 1200, 900)}
                srcSet={wixImageSrcSet(deal.image, [640, 900, 1200], 4 / 3)}
                sizes="(min-width: 1024px) 600px, (min-width: 640px) 90vw, 100vw"
                alt={`${deal.name}${deal.businessName ? ` at ${deal.businessName}` : ""}${place ? `, ${place}` : ""}`}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              <div aria-hidden className="flex h-full w-full items-center justify-center text-7xl opacity-40">
                {categoryEmoji}
              </div>
            )}
          </div>
        </div>

        {/* 3. Price, code and the one action. A bordered panel beside the
            photo on desktop; part of the page flow on a phone. */}
        <aside
          aria-label="Price and how to use this deal"
          className="lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start lg:rounded-[18px] lg:border lg:border-slate-200 lg:bg-white lg:p-6"
        >
          {deal.isFlash && deal.expiresAt && live && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3">
              <span className="text-xs font-bold text-brand-700">Offer ends in</span>
              <span className="text-right">
                <CountdownBadge
                  target={new Date(deal.expiresAt)}
                  variant="text"
                  className="block text-xl font-extrabold leading-tight text-brand-700"
                />
                <span className="block text-[0.6875rem] text-slate-600">
                  {formatOfferEndDate(deal.expiresAt, true)} · NZ time
                </span>
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-[2.5rem] font-semibold leading-none text-brand-700">
              {formatMoney(deal.now, deal.currency, deal.formattedNow)}
            </span>
            {deal.was > deal.now && (
              <span className="text-lg font-medium text-slate-500 line-through">
                <span className="sr-only">Usual price </span>
                {formatMoney(deal.was, deal.currency, deal.formattedWas)}
              </span>
            )}
          </div>
          {saving !== null && savingPct !== null && (
            <p className="mt-1.5 text-sm font-bold text-brand-700">
              Save {formatMoney(saving, deal.currency)} · {savingPct}% off
            </p>
          )}

          <div className="mt-5 border-t border-slate-200/80 pt-4">
            {/* Ended or sold out: a plain notice, no code or action. */}
            {!live ? (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center" aria-live="polite">
                <p className="text-sm font-bold text-slate-700">This offer has ended</p>
                <p className="mt-0.5 text-xs text-slate-600">It can no longer be claimed through MegaDeal.</p>
              </div>
            ) : !deal.inStock ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-700" aria-live="polite">
                Sold out — check back soon
              </p>
            ) : (
              <ContactBusiness
                businessName={deal.businessName}
                code={deal.dealCode}
                options={options}
                instruction={instruction}
                profileHref={profileHref}
                preview={preview}
                onAction={tracker.track}
                onOpen={tracker.interest}
              />
            )}
          </div>

          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            No payment to MegaDeal. You pay {businessLabel} directly.
          </p>
        </aside>

        {/* 4. What's included */}
        <section aria-labelledby="whats-included" className="lg:col-start-1 lg:row-start-2">
          <h2 id="whats-included" className="font-display text-xl font-semibold text-slate-900 sm:text-[1.375rem]">
            What&apos;s included
          </h2>
          <p className="mt-2 max-w-[65ch] whitespace-pre-line text-[0.9375rem] leading-relaxed text-slate-700">
            {deal.description}
          </p>
        </section>

        {/* 5. Key conditions, then every condition exactly as written. */}
        {(keyLines.length > 0 || endLine) && (
          <section aria-labelledby="key-conditions" className="lg:col-start-1 lg:row-start-3">
            <h2 id="key-conditions" className="font-display text-xl font-semibold text-slate-900 sm:text-[1.375rem]">
              Key conditions
            </h2>
            <ul className="mt-2.5 grid gap-1.5 text-[0.9375rem] text-slate-700">
              {keyLines.map((line) => (
                <li key={line} className="flex items-start gap-2 leading-snug">
                  <span aria-hidden="true" className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {line}
                </li>
              ))}
              {endLine && (
                <li className="flex items-start gap-2 leading-snug">
                  <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {endLine}
                </li>
              )}
            </ul>

            {moreInFull && (
              <details id="conditions" className="group mt-4 scroll-mt-24 rounded-xl border border-slate-200 px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-slate-900 marker:hidden [&::-webkit-details-marker]:hidden">
                  Full conditions
                  <span aria-hidden="true" className="text-slate-500 transition group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <DealConditions terms={deal.terms} className="mt-3 text-slate-700" />
              </details>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-slate-600">
              <p>
                Offered by {businessLabel}, subject to availability. MegaDeal advertises the deal and isn&apos;t part
                of your booking. See our{" "}
                <Link href="/terms" className="underline hover:text-slate-800">
                  terms
                </Link>
                . Deal not honoured?{" "}
                {preview ? (
                  <span className="font-semibold text-brand-700">Tell us</span>
                ) : (
                  <Link
                    href={`/contact?deal=${encodeURIComponent(deal.slug)}`}
                    className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                  >
                    Tell us
                  </Link>
                )}
                .
              </p>
              {/* Not in a preview: it would share the merchant's own
                  auth-gated /portal/new-deal page. */}
              {!preview && <ShareButtons title={deal.name} size="sm" />}
            </div>
          </section>
        )}
      </div>

      {/* 6. About the business */}
      <AboutBusiness deal={deal} preview={preview} onAction={tracker.track} />

      {moreDeals}
    </main>
  );
}
