"use client";

import { DEFAULT_CITY, cityPath } from "@/lib/cities";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney, formatOfferEndDate, offerDaysLeft } from "@/lib/format";
import { dealSaving, dealSavingPercent } from "@/lib/dealSaving";
import { isDealLive } from "@/lib/dealVisibility";
import { getDirectionsUrl } from "@/lib/mapLinks";
import { revealEmail } from "@/lib/hiddenEmail";
import CountdownBadge from "@/components/CountdownBadge";
import ShareButtons from "@/components/ShareButtons";
import GetDealCode from "./GetDealCode";
import BusinessSummary from "./BusinessSummary";
import { CalendarIcon } from "@/components/icons";
import { useDealActionTracker } from "@/lib/useDealActionTracker";
import Breadcrumbs from "@/components/Breadcrumbs";
import { placeLabel } from "@/lib/location";
import { splitTermsForDisplay } from "@/lib/dealTerms";
import DealConditions from "@/components/DealConditions";
import OpenStatus from "./OpenStatus";
import DealPhotos from "./DealPhotos";
import { DealProvenance, DealTags } from "@/components/DealProvenance";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import { effectiveBookingRequirement, termsSayWalkInsWelcome, websiteCodeHref } from "@/lib/booking";
import { resolveDealContact } from "@/lib/dealContact";
import { effectiveContact } from "@/lib/contactOverride";
import { parseBusinessHours } from "@/lib/businessHours";

// The deal is fetched server-side (see page.tsx), so the description,
// price, conditions and business details are in the raw HTML on first
// load — this component only adds interactivity (view tracking, copying
// the code, the Contact business pop-up) on top of real data.
//
// Deal first, business second. In DOM order: title, photo, price and the
// one action ("Get deal code", GetDealCode.tsx), what's included beside
// every condition, then a short word on the business with a link to its
// profile — so a phone (and a keyboard or screen reader) reads them in
// exactly that order. On a computer the price card sits beside the photo.
//
// The ways to contact the business come from one resolver
// (lib/dealContact.ts), from the business profile; the deal's booking
// requirement (lib/booking.ts) decides the wording. A missing booking link
// never reads as "no booking needed".
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

  const tracker = useDealActionTracker(deal.id, preview, deal.businessSlug);

  const category = deal.categories[0];
  const categoryEmoji = CATEGORIES.find((c) => c.name === category)?.emoji ?? "🏷️";
  const businessLabel = deal.businessName || "the business";
  const saving = dealSaving(deal.was, deal.now);
  const savingPct = dealSavingPercent(deal.was, deal.now);
  const place = placeLabel(deal.businessSuburb, deal.businessCity);

  // Every condition, exactly as the business wrote or ticked it.
  const conditions = deal.terms ? splitTermsForDisplay(deal.terms) : [];
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
  // The business's details, or this deal's own where it has them.
  const details = effectiveContact(
    {
      phone: deal.businessPhone,
      bookingUrl: deal.businessBookingUrl,
      website: deal.businessWebsite,
      email: deal.businessBookingEmail,
      preferred: deal.businessPreferredContact ?? null,
    },
    deal.contactOverride,
  );
  const contact = resolveDealContact({
    requirement,
    businessName: deal.businessName,
    dealName: deal.name,
    code: deal.dealCode,
    phone: details.phone,
    email: revealEmail(details.email),
    website: details.website,
    bookingUrl: details.bookingUrl,
    preferred: details.preferred,
    codeWebsiteUrl: codeLink,
    directionsUrl,
    addressText: hasPlace ? streetLine : null,
    walkIns: termsSayWalkInsWelcome(deal.terms),
  });
  const hours = parseBusinessHours(deal.businessHours);
  const profileHref = deal.businessSlug && !preview ? `/business/${deal.businessSlug}?from=${encodeURIComponent(deal.slug)}` : null;
  // Somewhere to go from a sold-out deal: the rest of its category.
  const soldOutCategory = CATEGORIES.find((c) => deal.categories.includes(c.name));
  const soldOutHref = !preview && soldOutCategory ? { href: categoryPath(soldOutCategory.name), label: soldOutCategory.name } : null;
  const priceNow = formatMoney(deal.now, deal.currency, deal.formattedNow);
  const priceWas = deal.was > deal.now ? formatMoney(deal.was, deal.currency, deal.formattedWas) : null;
  const bookingWord =
    requirement === "required" ? "Booking required" : requirement === "recommended" ? "Booking recommended" : requirement === "not_required" ? "No booking needed" : null;

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
      <Breadcrumbs
        compact
        items={[{ name: DEFAULT_CITY.name, href: cityPath() }, ...(category ? [{ name: category, href: categoryPath(category) }] : []), { name: deal.name }]}
      />

      {/* 1. Title and business */}
      <header>
        {deal.isTest ? (
          <span className="mb-1.5 inline-block rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">Test deal · preview only</span>
        ) : deal.isFlash ? (
          <span className="mb-1.5 inline-block rounded-full bg-brand-600 px-2.5 py-0.5 text-[0.6875rem] font-extrabold uppercase tracking-wide text-white">
            Flash Deal
          </span>
        ) : (
          // On a phone the breadcrumb above already names the category.
          category && (
            <span className="mb-1 hidden text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-brand-700 sm:block">{category}</span>
          )
        )}
        <h1 className="text-balance font-display text-[1.5rem] font-semibold leading-tight text-slate-900 sm:text-[1.75rem] lg:text-[2rem]">
          {deal.name}
        </h1>
        {(deal.businessName || place) && (
          <p className="mt-1 text-base text-slate-600">
            {deal.businessName &&
              // Only a link when there's a profile to go to.
              (profileHref ? (
                <Link
                  href={profileHref}
                  prefetch={false}
                  className="font-semibold text-slate-800 underline-offset-2 hover:text-brand-700 hover:underline"
                >
                  {deal.businessName}
                </Link>
              ) : (
                <span className="font-semibold text-slate-800">{deal.businessName}</span>
              ))}
            {deal.businessName && place && <span aria-hidden="true"> · </span>}
            {place}
            {!preview && <OpenStatus hours={deal.businessHours} />}
          </p>
        )}
      </header>

      {/* 2. Photo beside the price on a computer (about 60/40); photo,
          then price on a phone. */}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:mt-4 lg:mt-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)] lg:items-start lg:gap-6">
        <div>
          {deal.image ? (
            <DealPhotos
              images={[deal.image, ...(deal.gallery ?? [])]}
              alt={`${deal.name}${deal.businessName ? ` at ${deal.businessName}` : ""}${place ? `, ${place}` : ""}`}
            />
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-brand-50">
              <div aria-hidden className="flex h-full w-full items-center justify-center text-7xl opacity-40">
                {categoryEmoji}
              </div>
            </div>
          )}
        </div>

        {/* 3. Price and the one action, in a card that's as tall as its
            contents. */}
        <aside aria-label="Price and deal code" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
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

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-display text-[2.5rem] font-semibold leading-none text-brand-700 lg:text-[2.75rem]">{priceNow}</span>
            {priceWas && (
              <span className="text-xl text-slate-500 line-through">
                <span className="sr-only">Usual price </span>
                {priceWas}
              </span>
            )}
            {saving !== null && savingPct !== null && (
              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-800">
                Save {savingPct}%<span className="sr-only"> ({formatMoney(saving, deal.currency)})</span>
              </span>
            )}
          </div>
          {/* Whether to book and when it ends, beside the action: they
              decide whether it's worth acting on. Flash deals have their
              countdown above instead. */}
          {live && (bookingWord || (deal.expiresAt && !deal.isFlash)) && (
            <p className="mt-2.5 text-[0.9375rem] text-slate-700">
              {[bookingWord, deal.expiresAt && !deal.isFlash ? `Ends ${formatOfferEndDate(deal.expiresAt)}` : null].filter(Boolean).join(" · ")}
              {/* Days are counted in New Zealand, so this can differ from
                  the server's render around midnight. Not for a sold-out
                  deal: there's nothing left to hurry for. */}
              {deal.expiresAt && !deal.isFlash && deal.inStock && <span suppressHydrationWarning>{offerDaysLeft(deal.expiresAt)}</span>}
            </p>
          )}

          <div className="mt-4">
            {/* Ended or sold out: a plain notice, never a code. */}
            {!live ? (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center" aria-live="polite">
                <p className="text-sm font-bold text-slate-700">This offer has ended</p>
                <p className="mt-0.5 text-xs text-slate-600">It can no longer be claimed through MegaDeal.</p>
              </div>
            ) : !deal.inStock ? (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center" aria-live="polite">
                <p className="text-sm font-bold text-slate-700">Sold out — check back soon</p>
                {soldOutHref && (
                  <Link href={soldOutHref.href} prefetch={false} className="mt-1 inline-block text-sm font-semibold text-brand-700 underline-offset-2 hover:underline">
                    See more {soldOutHref.label} deals →
                  </Link>
                )}
              </div>
            ) : (
              <GetDealCode
                code={deal.dealCode}
                contact={contact}
                businessName={deal.businessName}
                dealName={deal.name}
                instructions={deal.customerInstructions ?? null}
                price={{ now: priceNow, was: priceWas, percentOff: savingPct }}
                hours={hours}
                profileHref={profileHref}
                preview={preview}
                onCopied={tracker.copied}
                onContact={(method) => tracker.contact(method, "code_panel")}
                onProfileClick={() => tracker.profileClick("code_panel")}
                onOpen={tracker.codeClick}
                onReveal={tracker.reveal}
              />
            )}
          </div>

          <p className="mt-3 text-center text-sm text-slate-600">Pay {businessLabel} directly.</p>
        </aside>
      </div>

      {/* 4. What's included and every condition, side by side on a
          computer. The conditions are all shown, as written: nothing
          material is folded away. */}
      <section aria-label="Deal details and conditions" className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:mt-5">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-slate-200">
          <div className="lg:pr-8">
            <h2 className="font-display text-xl font-semibold text-slate-900">Deal details</h2>
            <p className="mt-2 max-w-[65ch] whitespace-pre-line text-base leading-relaxed text-slate-700">{deal.description}</p>
            <DealTags tags={deal.tags} />
          </div>
          {(conditions.length > 0 || endLine) && (
            <div id="conditions" className="scroll-mt-24 lg:pl-8">
              <h2 className="font-display text-xl font-semibold text-slate-900">Conditions</h2>
              <DealConditions terms={deal.terms} columns={1} className="mt-2.5 text-slate-700" />
              {endLine && (
                <p className={`flex items-start gap-2 text-[0.9375rem] leading-snug text-slate-700 ${conditions.length > 0 ? "mt-2" : "mt-2.5"}`}>
                  <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {endLine}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 5. A short word on the business; its profile has the rest. */}
      <BusinessSummary
        deal={deal}
        preview={preview}
        onWebsite={() => tracker.contact("website", "deal_page")}
        onProfileClick={() => tracker.profileClick("deal_page")}
      />

      <DealProvenance deal={deal} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-slate-600">
        <p className="max-w-[80ch]">
          Offered by {businessLabel}, subject to availability. MegaDeal advertises the deal and isn&apos;t part of your
          booking. See our{" "}
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

      {/* The end of this deal: the phone's "Get deal code" bar
          (GetDealCode.tsx) gives way from here on. */}
      <div id="deal-end" aria-hidden="true" />

      {moreDeals}
    </main>
  );
}
