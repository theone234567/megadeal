"use client";

import { DEFAULT_CITY, cityPath } from "@/lib/cities";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { formatMoney, formatOfferEndDate } from "@/lib/format";
import { dealSaving, dealSavingPercent } from "@/lib/dealSaving";
import { isDealLive } from "@/lib/dealVisibility";
import { getMapUrl, getDirectionsUrl } from "@/lib/mapLinks";
import CountdownBadge from "@/components/CountdownBadge";
import ShareButtons from "@/components/ShareButtons";
import GetDealPanel from "./GetDealPanel";
import { PhoneIcon, MailIcon, GlobeIcon, MapPinIcon, ClockIcon, CalendarIcon, CheckIcon } from "@/components/icons";
import { trackDealEvent } from "@/lib/trackDeal";
import { useDealActionTracker } from "@/lib/useDealActionTracker";
import type { DealAction } from "@/lib/dealEvents";
import { parseBusinessHours, formatBusinessHoursLines, hoursKnown, isOpenNow } from "@/lib/businessHours";
import Breadcrumbs from "@/components/Breadcrumbs";
import { wixImageSrcSet, wixImageUrl } from "@/lib/wixImageUrl";
import { placeLabel, visitNote } from "@/lib/location";
import { keyRestrictions, splitTermsForDisplay } from "@/lib/dealTerms";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import { bookingPlan, effectiveBookingRequirement, type BookingAction } from "@/lib/booking";
import { safeWebHref } from "@/lib/socialLinks";

function ActionIcon({ kind }: { kind: BookingAction["kind"] }) {
  const cls = "h-4 w-4 shrink-0";
  return kind === "book_online" ? (
    <CalendarIcon className={cls} />
  ) : kind === "call" ? (
    <PhoneIcon className={cls} />
  ) : (
    <MailIcon className={cls} />
  );
}

function ActionLink({
  action,
  primary,
  small = false,
  onAction,
}: {
  action: BookingAction;
  primary: boolean;
  small?: boolean;
  onAction?: (action: DealAction) => void;
}) {
  return (
    <a
      href={action.href}
      onClick={() => onAction?.(action.kind === "call" ? "call" : action.kind === "email" ? "email" : "website")}
      {...(action.external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
      className={`flex w-full items-center justify-center gap-2 rounded-full px-4 text-center font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
        small ? "min-h-10 text-xs" : "min-h-[46px] text-sm"
      } ${
        primary
          ? "bg-brand-600 text-white hover:bg-brand-700"
          : "border border-brand-200 bg-white text-brand-700 hover:border-brand-400"
      }`}
    >
      <ActionIcon kind={action.kind} />
      {action.label}
      {action.external && <span className="sr-only"> (opens the business&apos;s site)</span>}
    </a>
  );
}

// The deal is fetched server-side (see page.tsx)
// so the description, price, and business info are present in the raw
// HTML on first load — this component only adds client-side interactivity
// (view tracking, the code reveal) on top of real data.
//
// Layout: title, photo, price/action, what's included, business — as
// independent grid items in that DOM order, so a phone reads (and a
// keyboard or screen reader moves through) them in exactly that sequence.
// On desktop the same items are placed into two columns with the action
// panel beside them. Not sticky: the site header is sticky and ~120px
// tall, and this panel is taller than a laptop screen once the code is
// revealed, so a sticky panel either hid its price under the header or cut
// off its own bottom.
//
// Booking and contact actions follow lib/booking.ts, from the deal's
// explicit booking requirement — a missing booking link never reads as
// "no booking needed".
//
// Not shown, though the Deal type carries them: businessRating (typed in
// by an admin, not aggregated customer reviews) and quantityAvailable (set
// once at creation and never decremented, so "Only 3 left" would be a
// fixed number presented as live scarcity).
export default function DealDetail({
  deal,
  /** "More deals from this business" and "You might also like", built on
   *  the server (see MoreDeals.tsx) and streamed in after the deal itself,
   *  so reading every other deal never holds up this one. Left out in the
   *  admin and merchant previews, which have no other deals to show. */
  moreDeals = null,
  /** Rendered inside the merchant's own preview rather than on the public
   *  page. No view or reveal is recorded: the deal has no real id yet, and
   *  counting the author looking at their own draft would put fictional
   *  traffic in their analytics before the deal exists. */
  preview = false,
}: {
  deal: Deal;
  moreDeals?: ReactNode;
  preview?: boolean;
}) {
  const conditionsRef = useRef<HTMLDetailsElement>(null);

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

  const trackAction = useDealActionTracker(deal.id, preview);

  useEffect(() => {
    if (preview) return;
    trackDealEvent(deal.id, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id, preview]);

  const category = deal.categories[0];
  const categoryEmoji = CATEGORIES.find((c) => c.name === category)?.emoji ?? "🏷️";
  const businessLabel = deal.businessName || "the business";
  const saving = dealSaving(deal.was, deal.now);
  const savingPct = dealSavingPercent(deal.was, deal.now);
  const restrictions = keyRestrictions(deal.terms);
  const conditions = deal.terms ? splitTermsForDisplay(deal.terms) : [];
  const plan = bookingPlan(
    effectiveBookingRequirement(deal.bookingRequirement, deal.terms),
    {
      bookingUrl: deal.businessBookingUrl,
      phone: deal.businessPhone,
      bookingEmail: deal.businessBookingEmail,
    },
    deal.businessName,
    deal.name,
    Boolean(deal.dealCode),
  );
  const location = {
    lat: deal.businessLat,
    lng: deal.businessLng,
    // With the suburb when the saved address lacks it: "5A Camelot Place,
    // Takapuna" finds the right street; the bare street may not.
    address:
      deal.businessAddress &&
      deal.businessSuburb &&
      !deal.businessAddress.toLowerCase().includes(deal.businessSuburb.toLowerCase())
        ? `${deal.businessAddress}, ${deal.businessSuburb}`
        : deal.businessAddress,
    city: deal.businessCity,
  };
  // A city alone isn't a place to navigate to — only link a map or
  // directions for a street address or pinned coordinates.
  // Never for a home-based or mobile business: its pin is only
  // approximate (lib/location.ts publicLocation), and its street private.
  const hasPlace = !deal.businessAddressHidden && Boolean(deal.businessAddress || (deal.businessLat != null && deal.businessLng != null));
  const mapUrl = hasPlace ? getMapUrl(location) : null;
  const directionsUrl = hasPlace ? getDirectionsUrl(location) : null;
  const websiteHref = safeWebHref(deal.businessWebsite);
  const instagramHref = safeWebHref(deal.businessInstagramUrl);
  const facebookHref = safeWebHref(deal.businessFacebookUrl);
  // "Takapuna, Auckland" under the deal's name; the full address in the
  // business section, adding the suburb and city only when the saved
  // address doesn't already include them.
  const place = placeLabel(deal.businessSuburb, deal.businessCity);
  const addressText = (deal.businessAddress ?? "").toLowerCase();
  const locationLine = [
    deal.businessAddress,
    deal.businessSuburb && !addressText.includes(deal.businessSuburb.toLowerCase()) ? deal.businessSuburb : null,
    deal.businessCity && !addressText.includes(deal.businessCity.toLowerCase()) ? deal.businessCity : null,
  ]
    .filter(Boolean)
    .join(", ");
  const hasAbout = Boolean(
    deal.businessBio ||
    deal.businessHours ||
    deal.businessPriceRange ||
    deal.businessAmenities.length > 0 ||
    locationLine ||
    plan.aboutActions.length > 0 ||
    websiteHref ||
    instagramHref ||
    facebookHref,
  );

  function openConditions() {
    const el = conditionsRef.current;
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-brand-600">{category}</span>
          )
        )}
        <h1 className="font-display mt-1.5 text-[1.75rem] font-semibold leading-tight text-slate-900 sm:text-[1.875rem] lg:text-[2.25rem]">
          {deal.name}
        </h1>
        {(deal.businessName || place) && (
          <p className="mt-[7px] flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            {deal.businessName &&
              // Only a link when there's a profile to go to — never a link
              // that looks real and goes nowhere.
              (deal.businessSlug && !preview ? (
                <Link
                  href={`/business/${deal.businessSlug}`}
                  // Not prefetched: the business page is built fresh from Wix
                  // (see DealCard).
                  prefetch={false}
                  className="font-bold text-slate-900 underline-offset-2 hover:text-brand-700 hover:underline"
                >
                  {deal.businessName}
                </Link>
              ) : (
                <span className="font-bold text-slate-900">{deal.businessName}</span>
              ))}
            {place && <span className="text-slate-500">{place}</span>}
          </p>
        )}
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)] lg:gap-x-8 lg:gap-y-8">
        {/* 2. Photo */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-brand-50">
            {deal.image ? (
              // A plain <img>: next/image makes no srcset while images are
              // unoptimized, and this lets a phone take a smaller copy.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={wixImageUrl(deal.image, 1200, 900)}
                srcSet={wixImageSrcSet(deal.image, [640, 900, 1200], 4 / 3)}
                sizes="(min-width: 1024px) 700px, 100vw"
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

        {/* 3. Price, key conditions and the next step */}
        <aside aria-label="Price and next step" className="lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
          <div className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-card">
            {deal.isFlash && deal.expiresAt && live && (
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-brand-50 px-5 py-3.5">
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

            <div className="p-5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="font-display text-[2.875rem] font-semibold leading-[1.07] text-brand-700">
                  {formatMoney(deal.now, deal.currency, deal.formattedNow)}
                </span>
                {deal.was > deal.now && (
                  <span className="text-[1.1875rem] font-medium text-slate-500 line-through">
                    <span className="sr-only">Usual price </span>
                    {formatMoney(deal.was, deal.currency, deal.formattedWas)}
                  </span>
                )}
              </div>
              {saving !== null && savingPct !== null && (
                <p className="mt-1.5 text-[0.8125rem] font-bold text-brand-700">
                  Save {formatMoney(saving, deal.currency)} · {savingPct}% off
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-600">
                {deal.currency || "NZD"} · Pay {businessLabel} directly · No payment to MegaDeal
              </p>

              {/* Get this deal (GetDealPanel.tsx): the code, how to use it
                  and one main action. Replaced by a plain notice once the
                  offer has ended or sold out: no code or action then. */}
              {!live ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center" aria-live="polite">
                  <p className="text-sm font-bold text-slate-700">This offer has ended</p>
                  <p className="mt-0.5 text-xs text-slate-600">It can no longer be claimed through MegaDeal.</p>
                </div>
              ) : !deal.inStock ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm font-bold text-slate-700" aria-live="polite">
                  Sold out — check back soon
                </div>
              ) : (
                <GetDealPanel
                  deal={deal}
                  plan={plan}
                  websiteHref={websiteHref}
                  directionsUrl={directionsUrl}
                  restrictions={restrictions}
                  preview={preview}
                  onAction={trackAction}
                />
              )}

              {(restrictions.length > 0 || conditions.length > 0 || (deal.expiresAt && !deal.isFlash)) && (
                <div className="mt-5 rounded-[13px] bg-brand-50 p-4 text-[0.8125rem]">
                  <h2 className="text-xs font-extrabold text-slate-900">{plan.conditionsHeading}</h2>
                  <ul className="mt-2 grid gap-2">
                    {restrictions.map((r) => (
                      <li key={r} className="flex items-start gap-2 leading-snug text-slate-800">
                        <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" />
                        {r}
                      </li>
                    ))}
                    {/* No standard conditions to summarise: show the
                        business's own lines as written, never a paraphrase. */}
                    {restrictions.length === 0 &&
                      conditions.slice(0, 3).map((line, i) => (
                        <li key={i} className="flex items-start gap-2 leading-snug text-slate-800">
                          <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" />
                          {line}
                        </li>
                      ))}
                    {restrictions.length === 0 && conditions.length > 3 && (
                      <li className="pl-5 text-xs text-slate-600">
                        + {conditions.length - 3} more in the full conditions
                      </li>
                    )}
                    {deal.expiresAt && !deal.isFlash && (
                      <li className="flex items-start gap-2 leading-snug text-slate-800">
                        <CalendarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" />
                        {live ? "Offer ends" : "Offer ended"} {formatOfferEndDate(deal.expiresAt)}
                      </li>
                    )}
                  </ul>
                </div>
              )}


              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                {/* Hidden while previewing: ShareButtons defaults to the
                    current URL, which here is the merchant's own auth-gated
                    /portal/new-deal page — useless to anyone it's sent to. */}
                {!preview && <ShareButtons title={deal.name} size="md" className="flex-wrap justify-center" />}
                {conditions.length > 0 && (
                  <button
                    type="button"
                    onClick={openConditions}
                    className="text-xs font-bold text-brand-700 underline-offset-2 hover:underline"
                  >
                    Full conditions
                  </button>
                )}
              </div>
              <p className="mt-3 text-center text-xs text-slate-600">
                Deal not honoured?{" "}
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
              </p>
            </div>
          </div>
        </aside>

        {/* 4. What's included and the complete conditions */}
        <section className="lg:col-start-1 lg:row-start-2">
          <h2 className="font-display text-[1.4375rem] font-semibold text-slate-900">What&apos;s included</h2>
          <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-relaxed text-slate-600">{deal.description}</p>

          {conditions.length > 0 && (
            <details
              ref={conditionsRef}
              id="conditions"
              className="group mt-6 scroll-mt-24 border-y border-slate-200/80 py-4"
            >
              <summary className="cursor-pointer list-none text-[0.9375rem] font-bold text-slate-900 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
                Full conditions
              </summary>
              {/* Every condition exactly as the business wrote it — the
                  summary above only ever shortens standard checkbox
                  conditions, so anything custom is read here. */}
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-slate-700">
                {conditions.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </details>
          )}

          <p className="mt-5 text-xs leading-relaxed text-slate-600">
            Price paid directly to {businessLabel} — MegaDeal doesn&apos;t process any payment. Offered directly by the
            business, subject to availability and while supplies last — MegaDeal is the advertiser, not a party to your
            booking. See our{" "}
            <Link href="/terms" className="underline hover:text-slate-700">
              terms
            </Link>
            .
          </p>
        </section>

        {/* 5. About the business */}
        {deal.businessName && hasAbout && (
          <section className="rounded-2xl bg-brand-50 p-5 lg:col-start-1 lg:row-start-3">
            <h2 className="font-display text-xl font-semibold text-slate-900">About {deal.businessName}</h2>
            {deal.businessPriceRange && (
              <p className="mt-2 text-sm font-semibold text-slate-600">{deal.businessPriceRange}</p>
            )}
            {deal.businessBio && <p className="mt-2 text-sm leading-relaxed text-slate-600">{deal.businessBio}</p>}
            {deal.businessAmenities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {deal.businessAmenities.map((a) => (
                  <span key={a} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {a}
                  </span>
                ))}
              </div>
            )}
            {locationLine && (
              <div className="mt-3">
                <p className="flex items-start gap-1.5 text-[0.8125rem] font-bold text-brand-700">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" /> {locationLine}
                </p>
                {deal.businessAddressHidden && (
                  <p className="mt-1 pl-6 text-xs text-slate-600">
                    {visitNote(deal.businessVisitType ?? "appointment", deal.businessServiceArea)}
                  </p>
                )}
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
                        onClick={() => trackAction("directions")}
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
            {deal.businessHours &&
              (() => {
                const parsedHours = parseBusinessHours(deal.businessHours);
                // "Closed now" only when real hours say so, never because
                // none were given.
                const openNow = parsedHours && hoursKnown(parsedHours) ? isOpenNow(parsedHours) : null;
                const lines = parsedHours ? formatBusinessHoursLines(parsedHours) : [deal.businessHours];
                if (lines.length === 0) return null;
                return (
                  <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      {/* The business's opening hours — not the times this
                          particular deal can be used, which are in its
                          conditions. */}
                      <p className="font-semibold text-slate-800">Opening hours</p>
                      {openNow !== null && (
                        <p
                          className={`my-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                            openNow ? "bg-green-50 text-green-700" : "bg-white text-slate-600"
                          }`}
                        >
                          {openNow ? "● Open now" : "Closed now"}
                        </p>
                      )}
                      {lines.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                );
              })()}

            {(plan.aboutActions.length > 0 || websiteHref || instagramHref || facebookHref) && (
              <div className="mt-4 border-t border-brand-100 pt-4">
                {plan.aboutActions.length > 0 && (
                  <>
                    <h3 className="text-[0.8125rem] font-extrabold text-slate-900">{plan.contactHeading}</h3>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {plan.aboutActions.map((action) => (
                        <ActionLink key={action.kind} action={action} primary={false} small onAction={trackAction} />
                      ))}
                    </div>
                    {plan.phone && <p className="mt-2 text-xs text-slate-600">{plan.phone.display}</p>}
                  </>
                )}
                {(websiteHref || instagramHref || facebookHref) && (
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    {[
                      {
                        href: websiteHref,
                        label: "Website",
                        icon: <GlobeIcon className="h-4 w-4" />,
                      },
                      { href: instagramHref, label: "Instagram", icon: null },
                      { href: facebookHref, label: "Facebook", icon: null },
                    ]
                      .filter(
                        (
                          l,
                        ): l is {
                          href: string;
                          label: string;
                          icon: React.ReactElement | null;
                        } => Boolean(l.href),
                      )
                      .map((l) => (
                        <a
                          key={l.label}
                          href={l.href}
                          onClick={l.label === "Website" ? () => trackAction("website") : undefined}
                          target="_blank"
                          rel="noopener noreferrer nofollow ugc"
                          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline"
                        >
                          {l.icon}
                          {l.label}
                        </a>
                      ))}
                  </div>
                )}
              </div>
            )}

            {deal.businessSlug && !preview && (
              <Link
                href={`/business/${deal.businessSlug}`}
                prefetch={false}
                className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
              >
                View full business profile →
              </Link>
            )}
          </section>
        )}
      </div>

      {moreDeals}
    </main>
  );
}
