import type { Metadata } from "next";
import BookingEmailLink from "@/components/BookingEmailLink";
import BackToDeal from "@/components/business/BackToDeal";
import ProfileViewTracker from "@/components/business/ProfileViewTracker";
import PhotoGallery from "@/components/business/PhotoGallery";
import { hideEmail } from "@/lib/hiddenEmail";
import { DEFAULT_CITY, cityPath } from "@/lib/cities";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBusinessProfileBySlug } from "@/lib/fetchDealServer";
import { SITE_URL, SITE_NAME, DEALS_OPEN } from "@/lib/siteConfig";
import { getDirectionsUrl } from "@/lib/mapLinks";
import { phoneLink } from "@/lib/booking";
import { comparableUrl } from "@/lib/dealContact";
import { leadingMethod } from "@/lib/contactOverride";
import { safeWebHref } from "@/lib/socialLinks";
import { formatMoney } from "@/lib/format";
import { dealSavingPercent } from "@/lib/dealSaving";
import type { Deal } from "@/lib/types";
import { locationNotes, placeLabel } from "@/lib/location";
import { truncateForMeta } from "@/lib/format";
import { PhoneIcon, GlobeIcon, MapPinIcon, ClockIcon, CalendarIcon, CheckIcon, FacebookIcon, InstagramIcon } from "@/components/icons";
import StarRating from "@/components/StarRating";
import ShareButtons from "@/components/ShareButtons";
import Breadcrumbs from "@/components/Breadcrumbs";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { businessTitle } from "@/lib/dealTitle";
import {
  parseBusinessHours,
  formatBusinessHoursLines,
  hoursKnown,
  openStatus,
  toOpeningHoursSpecification,
  toSpecialOpeningHoursSpecification,
} from "@/lib/businessHours";
import { wixImageSrcSet, wixImageUrl } from "@/lib/wixImageUrl";
import { businessPageIsThin } from "@/lib/businessIndexing";
import { INDEXABLE } from "@/lib/robotsMeta";

// Every other page that fetches live Wix data (homepage, category pages,
// the deal page, flash deals) sets an explicit revalidate window — this
// one didn't, which under Next's defaults means the whole page (deals
// shown, ratings, hours, "Open now") gets cached after the first request
// and never refreshes again on its own, not even after a new deployment's
// worth of real changes, until something triggers a rebuild of this exact
// URL. Same 60s window as the category pages this is closest to in shape.
export const revalidate = 60;

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  // As on the deal page: a failed read is the page's to report.
  const result = await fetchBusinessProfileBySlug(params.slug).catch(() => undefined);
  if (result === undefined) return { title: "Business" };
  if (!result) return { title: "Business not found" };

  const { business, deals } = result;
  // The town in the title is the strongest local signal a page can send
  // for "<business> <town>" and "<service> near me" searches: "Harbour &
  // Hearth, Takapuna, Auckland — Deals & Offers", shortened for long
  // names to what search results show (lib/dealTitle.ts).
  const title = businessTitle(business);
  // business.bio is merchant-written free text (up to 600 chars) —
  // truncated at a word boundary, same as deal descriptions on
  // /deal/[slug], so a long bio gets a clean SERP snippet instead of
  // Google truncating it somewhere arbitrary past its usual ~155-160
  // character display limit.
  const where = placeLabel(business.suburb, business.city);
  const summary = `${business.businessName}${where ? ` in ${where}` : ""} on ${SITE_NAME} — ${
    deals.length ? `${deals.length} live deal${deals.length === 1 ? "" : "s"}` : "deals when they run"
  }, contact details and opening hours.`;
  const bio = (business.bio ?? "").trim();
  // A one-line bio ("Mobile beauty therapist who comes to you.") is too
  // thin a snippet on its own: the summary follows it.
  const description = truncateForMeta(bio.length >= 70 ? bio : bio ? `${bio.replace(/[.!\s]*$/, "")}. ${summary}` : summary);
  const url = `${SITE_URL}/business/${business.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // Pre-launch, "/" redirects to /coming-soon so visitors never see a
    // demo-data-filled deal grid (see DEALS_OPEN in lib/siteConfig.ts)
    // — but this page is reachable directly regardless, so it needs the
    // same protection: no business/deal page should get indexed while
    // the catalog might still hold pre-launch test data.
    // Also kept out until it has something on it (lib/businessIndexing.ts).
    robots:
      DEALS_OPEN && !businessPageIsThin({ liveDeals: deals.length, bio: business.bio, photos: business.photos.length })
        ? INDEXABLE
        : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      // Every photo, not just the first — social platforms that support
      // multiple OG images (Facebook, LinkedIn) pick whichever renders
      // best, and the rest cost nothing extra to list.
      // Without photos, the logo, else MegaDeal's own card, so a shared
      // link never shows up bare.
      images:
        business.photos.length > 0
          ? business.photos.map((url) => ({
              url: wixImageUrl(url, 1200, 630, "jpg"),
              width: 1200,
              height: 630,
              alt: business.businessName,
            }))
          : business.logoUrl
            ? [{ url: wixImageUrl(business.logoUrl, 600, 600, "jpg"), width: 600, height: 600, alt: business.businessName }]
            : [`${SITE_URL}/opengraph-image`],
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function BusinessProfilePage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;
  const result = await fetchBusinessProfileBySlug(params.slug);
  if (!result) notFound();
  const { business, deals } = result;

  // Every way to get in touch the business actually supplied: a booking
  // link (or else its phone) as the button, the rest as links. The same
  // page as both website and booking link shows once.
  const phone = phoneLink(business.phone);
  const bookingHref = safeWebHref(business.bookingUrl);
  const websiteRaw = safeWebHref(business.website);
  const websiteHref = websiteRaw && !(bookingHref && comparableUrl(websiteRaw) === comparableUrl(bookingHref)) ? websiteRaw : null;
  const emailHidden = business.bookingEmail ? hideEmail(business.bookingEmail) : null;
  const facebook = safeWebHref(business.facebookUrl);
  const instagram = safeWebHref(business.instagramUrl);
  // The business's chosen main button when it's still usable, otherwise
  // booking link, then phone, then website (lib/contactOverride.ts).
  const lead = leadingMethod({
    phone: business.phone,
    bookingUrl: business.bookingUrl,
    website: websiteHref,
    email: null,
    preferred: business.preferredContact ?? null,
  });
  const mainContact =
    lead === "booking" && bookingHref
      ? { method: lead, label: "Book online", href: bookingHref, external: true, Icon: CalendarIcon }
      : lead === "phone" && phone
        ? { method: lead, label: "Call business", href: phone.href, external: false, Icon: PhoneIcon }
        : lead === "website" && websiteHref
          ? { method: lead, label: "Visit website", href: websiteHref, external: true, Icon: GlobeIcon }
          : null;
  const showPhoneLink = Boolean(phone) && mainContact?.method !== "phone";
  const showWebsiteLink = Boolean(websiteHref) && mainContact?.method !== "website";
  const place = placeLabel(business.suburb, business.city);
  const category = deals.flatMap((d) => d.categories)[0] ?? null;
  // The saved address plus the suburb and city it doesn't already include,
  // for the address line and the map search.
  const addressText = (business.address ?? "").toLowerCase();
  const missing = (v: string | null) => (v && !addressText.includes(v.toLowerCase()) ? v : null);
  // New Zealand style: "5A Camelot Place, Glenfield, Auckland 0629".
  const cityLine = [missing(business.city), missing(business.postcode)].filter(Boolean).join(" ");
  const fullAddress = [business.address, missing(business.suburb), cityLine].filter(Boolean).join(", ");
  const mapTarget = { ...business, address: [business.address, missing(business.suburb)].filter(Boolean).join(", ") || null };
  // None for a home-based or mobile business (its street is private and
  // its pin only approximate, lib/location.ts publicLocation).
  const directionsUrl = business.addressHidden ? null : getDirectionsUrl(mapTarget);
  const parsedHours = parseBusinessHours(business.businessHours);
  // Hours written as plain text before the hours editor existed are shown
  // as written; anything else that can't be read is never printed (T243).
  const legacyHours = !parsedHours && business.businessHours && !/^\s*[[{]/.test(business.businessHours) ? business.businessHours.slice(0, 300) : null;
  const hoursLines = parsedHours ? formatBusinessHoursLines(parsedHours) : legacyHours ? [legacyHours] : [];
  const known = parsedHours ? hoursKnown(parsedHours) : false;
  const specialHours = parsedHours ? toSpecialOpeningHoursSpecification(parsedHours) : [];
  const status = parsedHours ? openStatus(parsedHours) : null;
  const hasLocation = Boolean(fullAddress || place);
  const hasContact = Boolean(mainContact || websiteHref || phone || bookingHref || emailHidden || hasLocation || hoursLines.length || facebook || instagram);
  const cover = business.photos[0] ?? null;
  const link = "inline-flex min-h-[44px] items-center gap-1 font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800";

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            // Deal pages point their seller at this @id, tying each deal
            // to this business, its address and its opening hours.
            "@id": `${SITE_URL}/business/${business.slug}#business`,
            name: business.businessName,
            description: business.bio || undefined,
            // schema.org LocalBusiness.image accepts either one URL or an
            // array — Google's Merchant/LocalBusiness rich-result docs
            // specifically recommend multiple angles when available.
            image: business.photos.length > 0 ? business.photos : undefined,
            url: `${SITE_URL}/business/${business.slug}`,
            telephone: phone?.display || undefined,
            priceRange: business.priceRange || undefined,
            // A home-based or mobile business: its suburb and city, no
            // street, no pin, and the area it covers.
            address: business.address || business.addressHidden
              ? {
                  "@type": "PostalAddress",
                  streetAddress: business.address || undefined,
                  // Suburb as the locality, city as the region, when both
                  // are known.
                  addressLocality: business.suburb || business.city || undefined,
                  addressRegion: business.suburb ? business.city || undefined : undefined,
                  postalCode: business.postcode || undefined,
                  addressCountry: "NZ",
                }
              : undefined,
            geo:
              !business.addressHidden && business.lat !== null && business.lng !== null
                ? { "@type": "GeoCoordinates", latitude: business.lat, longitude: business.lng }
                : undefined,
            areaServed: business.serviceArea || undefined,
            openingHoursSpecification: parsedHours && known ? toOpeningHoursSpecification(parsedHours) : undefined,
            specialOpeningHoursSpecification: specialHours.length > 0 ? specialHours : undefined,
            // No aggregateRating here: this rating is a plain number an
            // admin types into a form (components/admin/MerchantRow.tsx),
            // not aggregated from genuine customer reviews. Marking it up
            // as schema.org AggregateRating would violate Google's
            // structured-data policy on review markup and risks a sitewide
            // manual action — the star rating still shows visually on the
            // page below, just not as verified review data.
            // Its live deals, by the @id each deal page gives its Offer
            // (lib/dealJsonLd.ts), so the business and its offers connect.
            makesOffer: deals.length > 0 ? deals.map((d) => ({ "@id": `${SITE_URL}/deal/${d.slug}#offer` })) : undefined,
            // Only links that pass the same check as the page's own (T140).
            sameAs: [websiteRaw, bookingHref, facebook, instagram].filter(Boolean),
          }),
        }}
      />

      <BackToDeal deals={deals.map((d) => ({ slug: d.slug, name: d.name }))} />
      <ProfileViewTracker businessSlug={business.slug} deals={deals.map((d) => ({ slug: d.slug, id: d.id }))} />
      <Breadcrumbs items={[{ name: DEFAULT_CITY.name, href: cityPath() }, { name: business.businessName }]} />

      {/* Who and where */}
      <header className="flex items-center gap-4">
        {business.logoUrl ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-50 ring-1 ring-slate-200 sm:h-20 sm:w-20">
            <Image src={wixImageUrl(business.logoUrl, 160, 160)} alt="" fill sizes="80px" className="object-cover" />
          </div>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-3xl font-semibold text-brand-700 sm:h-20 sm:w-20"
          >
            {business.businessName.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-tight text-slate-900 sm:text-[2rem]">{business.businessName}</h1>
          {(category || place) && <p className="mt-0.5 text-base text-slate-600">{[category, place].filter(Boolean).join(" · ")}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {business.claimed && (
              <Link
                href="/help#deal-checks"
                prefetch={false}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                title="This business runs its own MegaDeal account and lists its own deals"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Business verified
              </Link>
            )}
            {business.rating !== null && <StarRating rating={business.rating} reviewCount={business.reviewCount} />}
            {business.priceRange && <span className="text-sm font-semibold text-slate-600">{business.priceRange}</span>}
          </div>
        </div>
      </header>

      {/* One photo across the top, kept low so the details stay in view. */}
      {cover && (
        <div className="relative mt-4 aspect-[3/1] w-full overflow-hidden rounded-2xl bg-slate-100 sm:aspect-[4/1] lg:mt-5">
          <Image
            src={wixImageUrl(cover, 1200, 800)}
            // The business's own photo, named for image search and screen
            // readers: "Forno Ponsonby, Ponsonby, Auckland".
            alt={[business.businessName, place].filter(Boolean).join(", ")}
            fill
            priority
            sizes="(min-width: 1200px) 1136px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] lg:items-start lg:gap-5">
        {(business.bio || business.amenities.length > 0 || business.photos.length > 0) && (
          <section aria-labelledby="about-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 id="about-heading" className="font-display text-xl font-semibold text-slate-900">
              About
            </h2>
            {business.bio && <p className="mt-2 max-w-[65ch] whitespace-pre-line text-base leading-relaxed text-slate-700">{business.bio}</p>}
            {business.amenities.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Features">
                {business.amenities.map((a) => (
                  <li key={a} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {a}
                  </li>
                ))}
              </ul>
            )}
            {business.photos.length > 0 && (
              <div className={business.bio || business.amenities.length > 0 ? "mt-5 border-t border-slate-200 pt-5" : "mt-3"}>
                <h3 className="mb-3 font-display text-lg font-semibold text-slate-900">Photos</h3>
                <PhotoGallery photos={business.photos} name={business.businessName} />
              </div>
            )}
          </section>
        )}

        {hasContact && (
          <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 id="contact-heading" className="font-display text-xl font-semibold text-slate-900">
              Contact &amp; visit
            </h2>
            {mainContact && (
              <a
                href={mainContact.href}
                {...(mainContact.external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-brand-600 bg-white px-4 text-base font-bold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                <mainContact.Icon className="h-[18px] w-[18px]" />
                {mainContact.label}
                {mainContact.external && <span aria-hidden="true">↗</span>}
                {mainContact.external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            )}
            {(showWebsiteLink || showPhoneLink || (bookingHref && mainContact?.method !== "booking") || emailHidden) && (
              <ul className="mt-2 flex flex-wrap gap-x-5 text-sm">
                {bookingHref && mainContact?.method !== "booking" && (
                  <li>
                    <a href={bookingHref} target="_blank" rel="noopener noreferrer nofollow ugc" className={link}>
                      <CalendarIcon className="h-4 w-4" /> Book online <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                )}
                {showPhoneLink && phone && (
                  <li>
                    <a href={phone.href} className={link}>
                      <PhoneIcon className="h-4 w-4" /> {phone.display}
                    </a>
                  </li>
                )}
                {showWebsiteLink && websiteHref && (
                  <li>
                    <a href={websiteHref} target="_blank" rel="noopener noreferrer nofollow ugc" className={link}>
                      <GlobeIcon className="h-4 w-4" /> Website <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                )}
                {emailHidden && (
                  <li>
                    {/* Encoded in the HTML, shown by the browser: no spam bots. */}
                    <BookingEmailLink hidden={emailHidden} className={link} />
                  </li>
                )}
              </ul>
            )}

            {hasLocation && (
              <div className="mt-4 flex items-start gap-3 border-t border-slate-200 pt-4 text-[0.9375rem]">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">Location</p>
                  <p className="text-slate-700">{business.addressHidden ? place : fullAddress || place}</p>
                  {locationNotes(business.addressHidden, business.serviceArea).map((note) => (
                    <p key={note} className="text-sm text-slate-600">
                      {note}
                    </p>
                  ))}
                  {directionsUrl && (
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={`${link} text-sm`}>
                      Get directions <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {hoursLines.length > 0 && (
              <div className="mt-4 flex items-start gap-3 border-t border-slate-200 pt-4 text-[0.9375rem]">
                <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">Opening hours</p>
                  {/* From the hours the business gave, in New Zealand time. */}
                  {known && status && <p className={`text-sm font-semibold ${status.open ? "text-emerald-800" : "text-slate-600"}`}>{status.label}</p>}
                  <ul className="mt-0.5 tabular-nums text-slate-700">
                    {hoursLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {(facebook || instagram) && (
              <ul className="mt-3 flex flex-wrap gap-x-5 border-t border-slate-200 pt-2 text-sm">
                {facebook && (
                  <li>
                    <a href={facebook} target="_blank" rel="noopener noreferrer nofollow ugc" className={link}>
                      <FacebookIcon className="h-4 w-4" /> Facebook
                    </a>
                  </li>
                )}
                {instagram && (
                  <li>
                    <a href={instagram} target="_blank" rel="noopener noreferrer nofollow ugc" className={link}>
                      <InstagramIcon className="h-4 w-4" /> Instagram
                    </a>
                  </li>
                )}
              </ul>
            )}
          </section>
        )}
      </div>

      <section id="deals" aria-labelledby="deals-heading" className="mt-4 scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:mt-5">
        <h2 id="deals-heading" className="font-display text-xl font-semibold text-slate-900">
          {deals.length > 0 ? "Deals from this business" : `No live deals from ${business.businessName} right now`}
        </h2>
        {deals.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-200">
            {deals.map((d) => (
              <BusinessDealRow key={d.id} deal={d} place={place} />
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-slate-600">Check back soon: new deals appear here as soon as they go live.</p>
        )}
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[80ch] text-xs text-slate-500">
          {business.businessName} is a business advertising on MegaDeal — MegaDeal doesn&apos;t process any payment or
          booking and isn&apos;t a party to your booking with them. See our{" "}
          <Link href="/terms" className="underline hover:text-slate-700">
            terms
          </Link>
          .
        </p>
        <ShareButtons title={business.businessName} url={`${SITE_URL}/business/${business.slug}`} size="sm" />
      </div>
    </main>
  );
}

/** One of the business's deals: photo, title, place, price and one
 *  "View deal". */
function BusinessDealRow({ deal, place }: { deal: Deal; place: string | null }) {
  const saving = dealSavingPercent(deal.was, deal.now);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3 sm:flex-nowrap">
      <div className="relative aspect-[3/2] w-28 shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:w-40">
        {deal.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wixImageUrl(deal.image, 360, 240)}
            srcSet={wixImageSrcSet(deal.image, [360, 540], 3 / 2)}
            sizes="(min-width: 640px) 160px, 112px"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-brand-700">{deal.isFlash ? "Flash Deal" : "Everyday Deal"}</p>
        <h3 className="line-clamp-2 font-display text-lg font-semibold leading-snug text-slate-900">{deal.name}</h3>
        {place && <p className="text-sm text-slate-600">{place}</p>}
      </div>
      <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:shrink-0">
        <p className="whitespace-nowrap">
          <span className="font-display text-2xl font-semibold text-brand-700">{formatMoney(deal.now, deal.currency, deal.formattedNow)}</span>
          {saving !== null && (
            <span className="ml-1.5 text-sm text-slate-500 line-through">
              <span className="sr-only">Usual price </span>
              {formatMoney(deal.was, deal.currency, deal.formattedWas)}
            </span>
          )}
        </p>
        <Link
          href={`/deal/${deal.slug}`}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          View deal<span className="sr-only">: {deal.name}</span> <span aria-hidden="true">→</span>
        </Link>
      </div>
    </li>
  );
}
