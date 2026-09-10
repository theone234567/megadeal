import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DealDetail from "./DealDetail";
import { fetchDealForSEO, fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { SITE_URL, SITE_NAME, SITE_LAUNCHED } from "@/lib/siteConfig";
import { formatMoney } from "@/lib/format";
import { safeJsonLd } from "@/lib/safeJsonLd";

// See app/page.tsx for why this is a short revalidate window rather than
// force-dynamic. Kept tighter than the browse pages since this is the
// actual "contact the business" conversion page — a stale sold-out/
// quantity state here is the highest-stakes case for it to be wrong.
export const revalidate = 30;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const deal = await fetchDealForSEO(params.slug);
  if (!deal) {
    return { title: "Deal not found" };
  }

  const price = formatMoney(deal.now, deal.currency, deal.formattedNow);
  const businessSuffix = deal.businessName ? ` at ${deal.businessName}` : "";
  // The root layout's title.template ("%s | MegaDeal") already appends the
  // brand name to this — no "| SITE_NAME" suffix needed here, or the
  // rendered title doubles up. openGraph/twitter titles aren't run through
  // that template (shown standalone, e.g. on social platforms), so those
  // keep the brand-inclusive version.
  const title = `${deal.name}${businessSuffix} — ${deal.discountPercent > 0 ? `${deal.discountPercent}% off, ` : ""}${price}`;
  const socialTitle = `${title} | ${SITE_NAME}`;
  const description = stripHtml(deal.description).slice(0, 155) ||
    `${deal.name}${businessSuffix} for ${price}. Grab this deal on ${SITE_NAME} before it's gone.`;
  const url = `${SITE_URL}/deal/${deal.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // Pre-launch, "/" redirects to /coming-soon so visitors never see a
    // demo-data-filled deal grid (see SITE_LAUNCHED in lib/siteConfig.ts)
    // — but this page is reachable directly regardless, so it needs the
    // same protection: no deal page should get indexed while the catalog
    // might still hold pre-launch test data.
    robots: SITE_LAUNCHED ? undefined : { index: false, follow: true },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: deal.image ? [{ url: deal.image, width: 1200, height: 900, alt: deal.name }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: deal.image ? [deal.image] : undefined,
    },
  };
}

export default async function DealPage({ params }: { params: { slug: string } }) {
  const deal = await fetchDealForSEO(params.slug);
  if (!deal) notFound();

  const allDeals = await fetchAllLiveDealsServer();
  const others = allDeals.filter((d) => d.id !== deal.id);
  const sameCategory = others.filter((d) => d.categories.some((c) => deal.categories.includes(c)));
  const relatedDeals = (sameCategory.length > 0 ? sameCategory : others).slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            name: deal.name,
            description: stripHtml(deal.description) || deal.name,
            image: deal.image ? [deal.image] : undefined,
            category: deal.categories[0] || undefined,
            brand: deal.businessName
              ? { "@type": "Organization", name: deal.businessName }
              : undefined,
            offers: {
              "@type": "Offer",
              url: `${SITE_URL}/deal/${deal.slug}`,
              priceCurrency: deal.currency || "NZD",
              price: deal.now,
              availability:
                deal.inStock !== false
                  ? "https://schema.org/InStock"
                  : "https://schema.org/SoldOut",
              priceValidUntil: deal.expiresAt ?? undefined,
              seller: deal.businessName
                ? { "@type": "Organization", name: deal.businessName }
                : undefined,
            },
          }),
        }}
      />
      <DealDetail deal={deal} relatedDeals={relatedDeals} />
    </>
  );
}
