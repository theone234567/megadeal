import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DealDetail from "./DealDetail";
import { fetchDealForSEO, fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

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
    return { title: `Deal not found | ${SITE_NAME}` };
  }

  const price = formatMoney(deal.now, deal.currency, deal.formattedNow);
  const businessSuffix = deal.businessName ? ` at ${deal.businessName}` : "";
  const title = `${deal.name}${businessSuffix} — ${deal.discountPercent > 0 ? `${deal.discountPercent}% off, ` : ""}${price} | ${SITE_NAME}`;
  const description = stripHtml(deal.description).slice(0, 155) ||
    `${deal.name}${businessSuffix} for ${price}. Grab this deal on ${SITE_NAME} before it's gone.`;
  const url = `${SITE_URL}/deal/${deal.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: deal.image ? [{ url: deal.image, width: 1200, height: 900, alt: deal.name }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
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
          __html: JSON.stringify({
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
