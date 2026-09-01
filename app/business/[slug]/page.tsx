import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBusinessProfileBySlug } from "@/lib/fetchDealServer";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { getMapUrl, getDirectionsUrl } from "@/lib/mapLinks";
import DealGrid from "@/components/DealGrid";
import { PhoneIcon, MailIcon, GlobeIcon, MapPinIcon, ClockIcon, CalendarIcon } from "@/components/icons";
import StarRating from "@/components/StarRating";
import ShareButtons from "@/components/ShareButtons";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const result = await fetchBusinessProfileBySlug(params.slug);
  if (!result) return { title: `Business not found | ${SITE_NAME}` };

  const { business, deals } = result;
  const title = `${business.businessName} — Deals & Contact Info`;
  const description =
    business.bio ||
    `${business.businessName}${business.city ? ` in ${business.city}` : ""} on ${SITE_NAME} — ${deals.length} live deal${deals.length === 1 ? "" : "s"}, contact details and opening hours.`;
  const url = `${SITE_URL}/business/${business.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: business.logoUrl ? [{ url: business.logoUrl, width: 512, height: 512, alt: business.businessName }] : undefined,
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function BusinessProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const result = await fetchBusinessProfileBySlug(params.slug);
  if (!result) notFound();
  const { business, deals } = result;

  const hasContactInfo = Boolean(
    business.website || business.phone || business.address || business.bookingUrl || business.bookingEmail
  );
  const hasSocial = Boolean(business.facebookUrl || business.instagramUrl);
  const mapUrl = getMapUrl(business);
  const directionsUrl = getDirectionsUrl(business);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: business.businessName,
            description: business.bio || undefined,
            image: business.logoUrl || undefined,
            url: `${SITE_URL}/business/${business.slug}`,
            telephone: business.phone || undefined,
            address: business.address
              ? {
                  "@type": "PostalAddress",
                  streetAddress: business.address,
                  addressLocality: business.city || undefined,
                  addressCountry: "NZ",
                }
              : undefined,
            geo:
              business.lat !== null && business.lng !== null
                ? { "@type": "GeoCoordinates", latitude: business.lat, longitude: business.lng }
                : undefined,
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

      <Link href="/" className="text-sm text-slate-500 hover:text-brand-700">
        ← Back to all deals
      </Link>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {business.logoUrl ? (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <Image
                src={business.logoUrl}
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
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              {business.businessName}
            </h1>
            {business.rating !== null && (
              <StarRating rating={business.rating} reviewCount={business.reviewCount} className="mt-1" />
            )}
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              {business.city && (
                <span className="flex items-center gap-1">
                  <MapPinIcon className="h-3.5 w-3.5" /> {business.city}
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

        {(hasContactInfo || business.businessHours || hasSocial) && (
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            {hasContactInfo && (
              <div className="space-y-1.5 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
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
                      <MapPinIcon className="h-4 w-4 shrink-0" /> {business.address}
                      {business.city ? `, ${business.city}` : ""}
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

            {(business.businessHours || hasSocial) && (
              <div className="space-y-1.5 text-sm">
                {business.businessHours && (
                  <p className="flex items-start gap-2 text-slate-600">
                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" /> <span>{business.businessHours}</span>
                  </p>
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

      <h2 className="mb-5 mt-8 text-xl font-bold text-slate-900">
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
