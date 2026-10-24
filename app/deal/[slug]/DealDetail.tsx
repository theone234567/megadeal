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
import DealCodeReveal, { type CodeState } from "./DealCodeReveal";
import ContactBooking from "./ContactBooking";
import BusinessSummary from "./BusinessSummary";
import { CheckIcon } from "@/components/icons";
import { useDealActionTracker } from "@/lib/useDealActionTracker";
import Breadcrumbs from "@/components/Breadcrumbs";
import { placeLabel } from "@/lib/location";
import { splitTermsForDisplay } from "@/lib/dealTerms";
import { splitDescription } from "@/lib/dealDescription";
import DealPhotos from "./DealPhotos";
import { DealProvenance, DealTags } from "@/components/DealProvenance";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import { effectiveBookingRequirement, termsSayWalkInsWelcome, websiteCodeHref } from "@/lib/booking";
import { resolveDealContact } from "@/lib/dealContact";
import { effectiveContact } from "@/lib/contactOverride";

// The deal is fetched server-side (see page.tsx), so the description,
// price, conditions and business details are in the raw HTML on first
// load; this component only adds interactivity (the code, view and tap
// tracking, the email and the hours) on top of real data.
//
// The page has one job: get the deal code, then contact the business
// (MegaDeal takes no payment). In DOM order, so a phone, a keyboard and a
// screen reader all read it the same way: title, photo, the price card
// with the one purple action (DealCodeReveal.tsx), About this deal, What's
// included beside every condition, Contact & booking (ContactBooking.tsx,
// the only place hours show), then a short word on the business. On a
// computer the price card sits beside the rest and stays in view.
//
// The ways to contact the business come from one resolver
// (lib/dealContact.ts), from the business profile and the deal's own
// details; the deal's booking requirement (lib/booking.ts) decides the
// wording. A missing booking link never reads as "no booking needed".
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
  preview: previewProp = false,
  /** An example deal (lib/demoDeals.ts, /example/[slug]): the page as a
   *  preview, under an "Example only" banner, without breadcrumbs. */
  example = false,
  /** Inside a page that already has its main landmark (the portal's
   *  PortalShell): drawn in a <div> so there aren't two. */
  inMain = false,
}: {
  deal: Deal;
  moreDeals?: ReactNode;
  inMain?: boolean;
  preview?: boolean;
  example?: boolean;
}) {
  const preview = previewProp || example;
  // A customer can sit on this page a while; re-check every 30s so a deal
  // that ends while the tab is open stops offering its code and action.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (preview) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [preview]);
  // And once more the moment it ends: on the 30s check alone a Flash
  // deal's box read "Offer ends in Ended", with the code still on offer,
  // for up to half a minute after its end (local test, Oct 2026). Only
  // when the end is within a day: further out, the 30s check catches it
  // long before, and a timer that far ahead isn't worth keeping.
  const endsAt = deal.expiresAt ? new Date(deal.expiresAt).getTime() : NaN;
  useEffect(() => {
    if (preview || !Number.isFinite(endsAt)) return;
    const msLeft = endsAt - Date.now();
    if (msLeft <= 0 || msLeft > 24 * 60 * 60 * 1000) return;
    const id = setTimeout(() => setNow(Date.now()), msLeft + 250);
    return () => clearTimeout(id);
  }, [preview, endsAt]);
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
  const endLine = deal.expiresAt
    ? `${live ? "Offer ends" : "Offer ended"} ${formatOfferEndDate(deal.expiresAt, deal.isFlash)}${deal.isFlash ? " (NZ time)" : ""}`
    : null;

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
  // The code: in the deal for a preview, otherwise fetched when "Get deal
  // code" is pressed (T208), and only then in the contact text below.
  const needsFetch = !preview && !deal.dealCode && deal.hasDealCode === true;
  const [fetchedCode, setFetchedCode] = useState<string | null>(null);
  const [codeState, setCodeState] = useState<CodeState>("idle");
  async function loadCode() {
    if (!needsFetch || fetchedCode || codeState === "loading") return;
    setCodeState("loading");
    try {
      const res = await fetch("/api/deals/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: deal.slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && typeof json.code === "string") {
        setFetchedCode(json.code);
        setCodeState("idle");
      } else {
        setCodeState(res.status === 404 || res.status === 409 ? "unavailable" : "error");
      }
    } catch {
      setCodeState("error");
    }
  }
  const dealCode = deal.dealCode ?? fetchedCode;
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
    code: dealCode,
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
  const profileHref = deal.businessSlug && !preview ? `/business/${deal.businessSlug}?from=${encodeURIComponent(deal.slug)}` : null;
  // Somewhere to go from a sold-out deal: the rest of its category.
  const soldOutCategory = CATEGORIES.find((c) => deal.categories.includes(c.name));
  const soldOutHref = !preview && soldOutCategory ? { href: categoryPath(soldOutCategory.name), label: soldOutCategory.name } : null;
  const priceNow = formatMoney(deal.now, deal.currency, deal.formattedNow);
  const priceWas = deal.was > deal.now ? formatMoney(deal.was, deal.currency, deal.formattedWas) : null;
  const bookingWord =
    requirement === "required" ? "Booking required" : requirement === "recommended" ? "Booking recommended" : requirement === "not_required" ? "No booking needed" : null;

  // The description's prose is "About this deal"; a list the business
  // wrote in it is "What's included" (lib/dealDescription.ts).
  const about = splitDescription(deal.description);
  // Every condition, then when it ends and who takes the money: all on
  // the page, nothing folded into a pop-up.
  const conditionLines = [
    ...conditions,
    ...(endLine ? [endLine] : []),
    `You pay ${businessLabel} directly. MegaDeal does not take payment.`,
  ];

  // Contact & booking: one cell for each way the business gave, from the
  // same resolver as before. The email stays encoded until "Show email".
  const actions = [contact.primary, contact.secondary, ...contact.links].filter((a): a is NonNullable<typeof a> => Boolean(a));
  const byMethod = (m: string) => actions.find((a) => a.method === m) ?? null;
  const phone = byMethod("phone");
  const booking = byMethod("booking");
  const site = byMethod("website");
  const hasEmail = Boolean(byMethod("email"));
  // A booking page that is the website reads as the website.
  const sameAsSite = Boolean(booking && !site && details.website);
  const addressLine = hasPlace ? streetLine || place : place || deal.businessServiceArea || null;
  const addressNotes = [
    ...(deal.businessAddressHidden && deal.businessServiceArea ? [`Covers ${deal.businessServiceArea}`] : []),
    ...(deal.businessAddressHidden ? ["The exact address is given when you book."] : []),
  ];

  const Landmark = inMain ? "div" : "main";
  return (
    <Landmark className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
      {example ? (
        <div role="note" className="mb-4 flex flex-col gap-2 rounded-xl border border-hp-border bg-hp-lavender px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-hp-ink">
            <span className="mr-2 rounded-md bg-hp-ink px-2 py-0.5 text-xs font-extrabold tracking-[0.08em] text-white">EXAMPLE</span>
            This shows how a MegaDeal deal page will look. It isn&apos;t a live offer, the business is made up and the
            code can&apos;t be used.
          </p>
          <Link href="/#example-deals" className="shrink-0 text-sm font-semibold text-hp-purple underline underline-offset-2 hover:text-hp-purple-dark">
            Back to example deals
          </Link>
        </div>
      ) : (
        <Breadcrumbs
          compact
          items={[{ name: DEFAULT_CITY.name, href: cityPath() }, ...(category ? [{ name: category, href: categoryPath(category) }] : []), { name: deal.name }]}
        />
      )}

      {/* Eyebrow, the title (the page's one big heading) and where it is.
          Hours aren't here: they're once, in Contact & booking. */}
      <header>
        {deal.isTest ? (
          <span className="mb-1.5 inline-block rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">Test deal · preview only</span>
        ) : deal.isFlash ? (
          <span className="mb-1.5 inline-block rounded-full bg-hp-purple px-2.5 py-0.5 text-[0.6875rem] font-extrabold uppercase tracking-wide text-white">
            Flash Deal
          </span>
        ) : (
          category && <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-hp-purple">{category}</span>
        )}
        <h1 className="text-balance font-display text-[1.75rem] font-bold leading-[1.15] text-hp-ink sm:text-[2.125rem] lg:text-[2.5rem]">
          {deal.name}
        </h1>
        {(deal.businessName || place) && (
          <p className="mt-1.5 text-base text-hp-muted">
            {deal.businessName &&
              // Only a link when there's a profile to go to.
              (profileHref ? (
                <Link
                  href={profileHref}
                  prefetch={false}
                  onClick={() => tracker.profileClick("deal_page")}
                  className="font-semibold text-hp-ink underline-offset-2 hover:text-hp-purple hover:underline"
                >
                  {deal.businessName}
                </Link>
              ) : (
                <span className="font-semibold text-hp-ink">{deal.businessName}</span>
              ))}
            {deal.businessName && place && <span aria-hidden="true"> · </span>}
            {place}
          </p>
        )}
      </header>

      {/* The photo and the rest of the deal on the left; the price card on
          the right, staying in view as the page scrolls. On a phone: photo,
          price card, then the rest, in that order (the DOM order). */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:mt-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:gap-x-8 lg:gap-y-10">
        <div className="lg:col-start-1 lg:row-start-1">
          {deal.image ? (
            <DealPhotos
              images={[deal.image, ...(deal.gallery ?? [])]}
              alt={`${deal.name}${deal.businessName ? ` at ${deal.businessName}` : ""}${place ? `, ${place}` : ""}`}
            />
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-hp-lavender">
              <div aria-hidden className="flex h-full w-full items-center justify-center text-7xl opacity-40">
                {categoryEmoji}
              </div>
            </div>
          )}
        </div>

        <aside aria-label="Price and deal code" className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="rounded-xl border border-hp-border bg-white p-5 sm:p-6 lg:sticky lg:top-24">
            {deal.isFlash && deal.expiresAt && live && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-hp-lavender px-4 py-3">
                <span className="text-xs font-bold text-hp-purple-dark">Offer ends in</span>
                <span className="text-right">
                  <CountdownBadge
                    target={new Date(deal.expiresAt)}
                    variant="text"
                    className="block text-xl font-extrabold leading-tight text-hp-purple-dark"
                  />
                  <span className="block text-[0.6875rem] text-hp-muted">{formatOfferEndDate(deal.expiresAt, true)} · NZ time</span>
                </span>
              </div>
            )}

            <p className="text-sm font-semibold text-hp-muted">Deal price</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-display text-[2.5rem] font-bold leading-none text-hp-purple">{priceNow}</span>
              {priceWas && (
                <span className="text-xl text-hp-muted line-through">
                  <span className="sr-only">Usual price </span>
                  {priceWas}
                </span>
              )}
              {saving !== null && savingPct !== null && (
                <span className="rounded-lg bg-green-100 px-2 py-1 text-sm font-bold text-green-700">
                  Save {savingPct}%<span className="sr-only"> ({formatMoney(saving, deal.currency)})</span>
                </span>
              )}
            </div>
            {/* Whether to book and when it ends, beside the action. Flash
                deals have their countdown above instead. */}
            {live && (bookingWord || (deal.expiresAt && !deal.isFlash)) && (
              <p className="mt-2.5 text-[0.9375rem] text-hp-ink">
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
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-center" aria-live="polite">
                  <p className="text-sm font-bold text-hp-ink">This offer has ended</p>
                  <p className="mt-0.5 text-xs text-hp-muted">It can no longer be claimed through MegaDeal.</p>
                </div>
              ) : !deal.inStock ? (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-center" aria-live="polite">
                  <p className="text-sm font-bold text-hp-ink">Sold out — check back soon</p>
                  {soldOutHref && (
                    <Link href={soldOutHref.href} prefetch={false} className="mt-1 inline-block text-sm font-semibold text-hp-purple underline-offset-2 hover:underline">
                      See more {soldOutHref.label} deals →
                    </Link>
                  )}
                </div>
              ) : (
                <DealCodeReveal
                  slug={deal.slug}
                  code={dealCode}
                  codePending={needsFetch && !fetchedCode}
                  codeState={codeState}
                  onNeedCode={loadCode}
                  instruction={contact.instruction}
                  note={contact.footer.replace(/^Pay the business directly\.\s*/, "") || null}
                  ownWords={deal.customerInstructions?.trim() || null}
                  businessName={deal.businessName}
                  price={{ now: priceNow, was: priceWas }}
                  preview={preview}
                  onReveal={(source) => {
                    tracker.codeClick(source);
                    tracker.reveal();
                  }}
                  onCopied={tracker.copied}
                />
              )}
            </div>

            <p className="mt-3 text-center text-sm text-hp-muted">Pay the business directly.</p>
          </div>
        </aside>

        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-2">
          {(about.paragraphs.length > 0 || deal.tags?.length) && (
            <section aria-labelledby="about-deal">
              <h2 id="about-deal" className="text-lg font-bold text-hp-ink">
                About this deal
              </h2>
              <div className="mt-2 max-w-[65ch] space-y-3 text-base leading-relaxed text-hp-ink">
                {about.paragraphs.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
              <DealTags tags={deal.tags} />
            </section>
          )}

          {/* One white panel: what's included beside every condition (all
              of them, as written), split by a line. */}
          <section aria-label="What's included and conditions" className="rounded-xl border border-hp-border bg-white">
            <div className={`grid ${about.included.length ? "md:grid-cols-2" : ""}`}>
              {about.included.length > 0 && (
                <div className="border-b border-hp-border p-5 sm:p-6 md:border-b-0 md:border-r">
                  <h2 className="text-lg font-bold text-hp-ink">What&apos;s included</h2>
                  <ul className="mt-3 space-y-2 text-[0.9375rem] leading-snug text-hp-ink">
                    {about.included.map((line, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-hp-purple" />
                        <span className="min-w-0">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div id="conditions" className="scroll-mt-24 p-5 sm:p-6">
                <h2 className="text-lg font-bold text-hp-ink">Conditions</h2>
                <ul className={`mt-3 grid gap-x-8 gap-y-2 text-[0.9375rem] leading-snug text-hp-ink ${about.included.length ? "" : "sm:grid-cols-2"}`}>
                  {conditionLines.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-hp-purple" />
                      <span className="min-w-0">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <ContactBooking
            addressLine={addressLine}
            hours={deal.businessHours}
            phone={phone ? { display: phone.detail, href: phone.href } : null}
            email={
              hasEmail
                ? {
                    reveal: () => {
                      const a = byMethod("email");
                      return a ? { address: a.detail, href: a.href } : null;
                    },
                  }
                : null
            }
            website={site ? { display: site.detail, href: site.href } : sameAsSite && booking ? { display: booking.detail, href: booking.href } : null}
            booking={booking && !sameAsSite ? { label: booking.label, href: booking.href } : null}
            fullAddress={hasPlace ? [streetLine, deal.businessCity].filter(Boolean).join(", ") || null : null}
            addressNotes={addressNotes}
            mapsUrl={directionsUrl}
            profileHref={profileHref}
            preview={preview}
            onContact={(method) => tracker.contact(method === "booking" && sameAsSite ? "website" : method, "deal_page")}
          />

          <BusinessSummary
            deal={deal}
            preview={preview}
            onWebsite={() => tracker.contact("website", "deal_page")}
            onProfileClick={() => tracker.profileClick("deal_page")}
          />
        </div>
      </div>

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
            <span className="font-semibold text-hp-purple">Tell us</span>
          ) : (
            <Link
              href={`/contact?deal=${encodeURIComponent(deal.slug)}`}
              className="font-semibold text-hp-purple underline underline-offset-2 hover:text-hp-purple-dark"
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
          (DealCodeReveal.tsx) gives way from here on. */}
      <div id="deal-end" aria-hidden="true" />

      {moreDeals}
    </Landmark>
  );
}
