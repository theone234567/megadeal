import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchBusinessProfileBySlug } from "@/lib/fetchDealServer";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import DealGrid from "@/components/DealGrid";

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

  const hasContactInfo = Boolean(business.website || business.phone || business.address);
  const hasSocial = Boolean(business.facebookUrl || business.instagramUrl);

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
            sameAs: [business.website, business.facebookUrl, business.instagramUrl].filter(
              Boolean
            ),
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
            {business.city && <p className="mt-1 text-sm text-slate-500">📍 {business.city}</p>}
          </div>
        </div>

        {business.bio && (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">{business.bio}</p>
        )}

        {(hasContactInfo || business.businessHours || hasSocial) && (
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            {hasContactInfo && (
              <div className="space-y-1.5 text-sm">
                {business.phone && (
                  <a
                    href={`tel:${business.phone.replace(/[^0-9+]/g, "")}`}
                    className="flex items-center gap-2 font-medium text-brand-700 hover:underline"
                  >
                    📞 {business.phone}
                  </a>
                )}
                {business.website && (
                  <a
                    href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-medium text-brand-700 hover:underline"
                  >
                    🌐 Visit website
                  </a>
                )}
                {business.address && (
                  <p className="flex items-center gap-2 text-slate-600">
                    📍 {business.address}
                    {business.city ? `, ${business.city}` : ""}
                  </p>
                )}
              </div>
            )}

            {(business.businessHours || hasSocial) && (
              <div className="space-y-1.5 text-sm">
                {business.businessHours && (
                  <p className="flex items-start gap-2 text-slate-600">
                    🕐 <span>{business.businessHours}</span>
                  </p>
                )}
                {hasSocial && (
                  <div className="flex items-center gap-3">
                    {business.facebookUrl && (
                      <a
                        href={business.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Facebook
                      </a>
                    )}
                    {business.instagramUrl && (
                      <a
                        href={business.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
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
