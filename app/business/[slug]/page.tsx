import type { Metadata } from "next";
import { DEFAULT_CITY, cityPath } from "@/lib/cities";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBusinessProfileBySlug } from "@/lib/fetchDealServer";
import { SITE_URL, SITE_NAME, SITE_LAUNCHED } from "@/lib/siteConfig";
import { getMapUrl, getDirectionsUrl } from "@/lib/mapLinks";
import { placeLabel, visitNote } from "@/lib/location";
import { truncateForMeta } from "@/lib/format";
import DealGrid from "@/components/DealGrid";
import HowToUseStrip from "@/components/HowToUseStrip";
import { PhoneIcon, MailIcon, GlobeIcon, MapPinIcon, ClockIcon, CalendarIcon } from "@/components/icons";
import StarRating from "@/components/StarRating";
import ShareButtons from "@/components/ShareButtons";
import Breadcrumbs from "@/components/Breadcrumbs";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { businessTitle } from "@/lib/dealTitle";
import {
  parseBusinessHours,
  formatBusinessHoursLines,
  hoursKnown,
  isOpenNow,
  toOpeningHoursSpecification,
  toSpecialOpeningHoursSpecification,
} from "@/lib/businessHours";
import { wixImageUrl } from "@/lib/wixImageUrl";

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
  const description =
    (business.bio ? truncateForMeta(business.bio) : "") ||
    `${business.businessName}${placeLabel(business.suburb, business.city) ? ` in ${placeLabel(business.suburb, business.city)}` : ""} on ${SITE_NAME} — ${deals.length} live deal${deals.length === 1 ? "" : "s"}, contact details and opening hours.`;
  const url = `${SITE_URL}/business/${business.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // Pre-launch, "/" redirects to /coming-soon so visitors never see a
    // demo-data-filled deal grid (see SITE_LAUNCHED in lib/siteConfig.ts)
    // — but this page is reachable directly regardless, so it needs the
    // same protection: no business/deal page should get indexed while
    // the catalog might still hold pre-launch test data.
    robots: SITE_LAUNCHED ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      // Every photo, not just the first — social platforms that support
      // multiple OG images (Facebook, LinkedIn) pick whichever renders
      // best, and the rest cost nothing extra to list.
      images:
        business.photos.length > 0
          ? business.photos.map((url) => ({
              url: wixImageUrl(url, 1200, 630, "jpg"),
              width: 1200,
              height: 630,
              alt: business.businessName,
            }))
          : undefined,
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

  const hasContactInfo = Boolean(
    business.website || business.phone || business.address || business.addressHidden || business.bookingUrl || business.bookingEmail
  );
  const hasSocial = Boolean(business.facebookUrl || business.instagramUrl);
  // The saved address plus the suburb and city it doesn't already include,
  // for the address line and the map search.
  const addressText = (business.address ?? "").toLowerCase();
  const missing = (v: string | null) => (v && !addressText.includes(v.toLowerCase()) ? v : null);
  const fullAddress = [business.address, missing(business.suburb), missing(business.city)].filter(Boolean).join(", ");
  const mapTarget = { ...business, address: [business.address, missing(business.suburb)].filter(Boolean).join(", ") || null };
  // None for a home-based or mobile business (its street is private and
  // its pin only approximate, lib/location.ts publicLocation).
  const mapUrl = business.addressHidden ? null : getMapUrl(mapTarget);
  const directionsUrl = business.addressHidden ? null : getDirectionsUrl(mapTarget);
  const parsedHours = parseBusinessHours(business.businessHours);
  const hoursLines = parsedHours ? formatBusinessHoursLines(parsedHours) : null;
  // "Closed now" only when real hours say so, never because none were given.
  const known = parsedHours ? hoursKnown(parsedHours) : false;
  const openNow = parsedHours && known ? isOpenNow(parsedHours) : null;
  const specialHours = parsedHours ? toSpecialOpeningHoursSpecification(parsedHours) : [];
  // Hours set but empty (no open day, no notes, no upcoming dates) show nothing.
  const showHours = Boolean(business.businessHours) && (!hoursLines || hoursLines.length > 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
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
            telephone: business.phone || undefined,
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
            sameAs: [
              business.website,
              business.bookingUrl,
              business.facebookUrl,
              business.instagramUrl,
            ].filter(Boolean),
          }),
        }}
      />

      <Breadcrumbs items={[{ name: DEFAULT_CITY.name, href: cityPath() }, { name: business.businessName }]} />

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {business.logoUrl ? (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <Image
                src={wixImageUrl(business.logoUrl, 160, 160)}
                alt={business.businessName}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-4xl">
              🏪
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {business.businessName}
            </h1>
            {business.rating !== null && (
              <StarRating rating={business.rating} reviewCount={business.reviewCount} className="mt-1" />
            )}
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              {placeLabel(business.suburb, business.city) && (
                <span className="flex items-center gap-1">
                  <MapPinIcon className="h-3.5 w-3.5" /> {placeLabel(business.suburb, business.city)}
                </span>
              )}
              {business.priceRange && (
                <span className="font-semibold text-slate-600">{business.priceRange}</span>
              )}
            </p>
            <ShareButtons
              title={business.businessName}
              url={`${SITE_URL}/business/${business.slug}`}
              className="mt-2"
            />
          </div>
        </div>

        {business.bio && (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">{business.bio}</p>
        )}

        {business.amenities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {business.amenities.map((a) => (
              <span
                key={a}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Only past 1 photo — a single photo is already shown as the
            avatar above, so a one-tile gallery here would just repeat it. */}
        {business.photos.length > 1 && (
          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {business.photos.map((url, i) => (
              <div
                key={url + i}
                className="relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
              >
                <Image
                  src={wixImageUrl(url, 600, 600)}
                  // Real, distinct alt text per photo — what actually shows
                  // up in Google Image Search and to screen readers, unlike
                  // the empty alt on the small avatar above (decorative,
                  // since the business name right next to it already says
                  // the same thing).
                  alt={`${business.businessName} — photo ${i + 1}`}
                  fill
                  sizes="(min-width: 640px) 25vw, 33vw"
                  loading="lazy"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {(hasContactInfo || business.businessHours || hasSocial) && (
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            {hasContactInfo && (
              <div className="space-y-1.5 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  How to book
                </p>
                {business.bookingUrl && (
                  <a
                    href={business.bookingUrl.startsWith("http") ? business.bookingUrl : `https://${business.bookingUrl}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="mb-1 flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2 font-bold text-white transition hover:bg-brand-700 active:scale-95"
                  >
                    <CalendarIcon className="h-4 w-4" /> Book now
                  </a>
                )}
                {business.phone && (
                  <a
                    href={`tel:${business.phone.replace(/[^0-9+]/g, "")}`}
                    className="flex items-center gap-2 font-medium text-brand-700 hover:underline"
                  >
                    <PhoneIcon className="h-4 w-4 shrink-0" /> {business.phone}
                  </a>
                )}
                {business.bookingEmail && (
                  <a
                    href={`mailto:${business.bookingEmail}`}
                    className="flex items-center gap-2 font-medium text-brand-700 hover:underline"
                  >
                    <MailIcon className="h-4 w-4 shrink-0" /> {business.bookingEmail}
                  </a>
                )}
                {business.website && (
                  <a
                    href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="flex items-center gap-2 font-medium text-brand-700 hover:underline"
                  >
                    <GlobeIcon className="h-4 w-4 shrink-0" /> Visit website
                  </a>
                )}
                {business.address && (
                  <div>
                    <p className="flex items-center gap-2 text-slate-600">
                      <MapPinIcon className="h-4 w-4 shrink-0" /> {fullAddress}
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
                {business.addressHidden && (
                  <div>
                    {placeLabel(business.suburb, business.city) && (
                      <p className="flex items-center gap-2 text-slate-600">
                        <MapPinIcon className="h-4 w-4 shrink-0" /> {placeLabel(business.suburb, business.city)}
                      </p>
                    )}
                    <p className="mt-1 pl-6 text-xs text-slate-600">
                      {visitNote(business.visitType, business.serviceArea)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {(showHours || hasSocial) && (
              <div className="space-y-1.5 text-sm">
                {showHours && (
                  <div className="flex items-start gap-2 text-slate-600">
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
                      {hoursLines ? (
                        hoursLines.map((line, i) => <p key={i}>{line}</p>)
                      ) : (
                        <p>{business.businessHours}</p>
                      )}
                    </div>
                  </div>
                )}
                {hasSocial && (
                  <div className="flex items-center gap-3">
                    {business.facebookUrl && (
                      <a
                        href={business.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Facebook
                      </a>
                    )}
                    {business.instagramUrl && (
                      <a
                        href={business.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Instagram
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {business.businessName} is a business advertising on MegaDeal —
        MegaDeal doesn&apos;t process any payment or booking and isn&apos;t
        a party to your booking with them. See our{" "}
        <Link href="/terms" className="underline hover:text-slate-500">
          terms
        </Link>
        .
      </p>

      {deals.length > 0 && (
        <div className="mt-8">
          <HowToUseStrip bare />
        </div>
      )}
      <h2 className="font-display mb-5 mt-6 text-xl font-bold text-slate-900">
        {deals.length > 0
          ? `${deals.length} live deal${deals.length === 1 ? "" : "s"} from ${business.businessName}`
          : `No live deals from ${business.businessName} right now`}
      </h2>
      <DealGrid
        deals={deals}
        emptyMessage={`${business.businessName} doesn't have any live deals at the moment — check back soon!`}
      />
    </main>
  );
}
