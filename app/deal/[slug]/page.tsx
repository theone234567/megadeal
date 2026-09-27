import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DealDetail from "./DealDetail";
import { fetchDealForSEO, fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { SITE_URL, SITE_NAME, SITE_LAUNCHED } from "@/lib/siteConfig";
import { formatMoney, truncateForMeta } from "@/lib/format";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { wixImageUrl } from "@/lib/wixImageUrl";

// See app/page.tsx for why this is a short revalidate window rather than
// force-dynamic. Kept tighter than the browse pages since this is the
// actual "contact the business" conversion page — a stale sold-out/
// quantity state here is the highest-stakes case for it to be wrong.
export const revalidate = 30;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The snippet under the deal in search results. Leads with the deal's
 * name, then what a searcher compares — business, town, price and
 * saving — and fills the rest with the business's own description.
 * Bing shows this nearly word for word (Google rewrites it more often),
 * and a merchant's opening sentence rarely carries the price or place.
 */
function dealMetaDescription(
  deal: { name: string; description: string; discountPercent: number; was: number; now: number; currency: string | null; formattedWas: string | null; businessName: string | null; businessCity: string | null },
  price: string
): string {
  const where = [deal.businessName ? `at ${deal.businessName}` : "", deal.businessCity ? `in ${deal.businessCity}` : ""]
    .filter(Boolean)
    .join(" ");
  const was = deal.discountPercent > 0 && deal.was > deal.now ? ` (was ${formatMoney(deal.was, deal.currency || "NZD", deal.formattedWas)})` : "";
  const saving = deal.discountPercent > 0 ? `, ${deal.discountPercent}% off` : "";
  const lead = `${deal.name}${where ? ` ${where}` : ""} — ${price}${was}${saving}. Free deal code, pay the business directly.`;
  const rest = stripHtml(deal.description);
  return truncateForMeta(rest ? `${lead} ${rest}` : lead);
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
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
  const description = dealMetaDescription(deal, price);
  const url = `${SITE_URL}/deal/${deal.slug}`;
  // The 1200x630 shape Facebook, LinkedIn and WhatsApp previews expect,
  // resized by Wix's CDN — not the business's original upload, which is
  // often several MB and the wrong shape. Non-Wix photos pass through.
  const shareImage = deal.image ? wixImageUrl(deal.image, 1200, 630, "jpg") : null;

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
      images: shareImage ? [{ url: shareImage, width: 1200, height: 630, alt: deal.name }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: shareImage ? [shareImage] : undefined,
    },
  };
}

export default async function DealPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const deal = await fetchDealForSEO(params.slug);
  if (!deal) notFound();

  const allDeals = await fetchAllLiveDealsServer();
  const others = allDeals.filter((d) => d.id !== deal.id);

  // Same business first: someone who liked this deal is often more
  // interested in this specific business's other offers than in a
  // same-category deal from a stranger. Capped higher than "you might
  // also like" below since it's the more relevant list.
  const otherBusinessDeals = deal.businessSlug
    ? others.filter((d) => d.businessSlug === deal.businessSlug).slice(0, 8)
    : [];
  const otherBusinessDealIds = new Set(otherBusinessDeals.map((d) => d.id));

  // "You might also like" fills in with same-category deals from OTHER
  // businesses — excluding anything already shown above so the same deal
  // never appears twice on the page.
  const remainingOthers = others.filter((d) => !otherBusinessDealIds.has(d.id));
  const sameCategory = remainingOthers.filter((d) => d.categories.some((c) => deal.categories.includes(c)));
  const relatedDeals = (sameCategory.length > 0 ? sameCategory : remainingOthers).slice(0, 4);

  // The business behind the deal, as a local business with a place —
  // linked by @id to the full record on its /business page, so search
  // engines can connect the offer to a real location for local searches.
  const seller = deal.businessName
    ? {
        "@type": "LocalBusiness",
        ...(deal.businessSlug
          ? {
              "@id": `${SITE_URL}/business/${deal.businessSlug}#business`,
              url: `${SITE_URL}/business/${deal.businessSlug}`,
            }
          : {}),
        name: deal.businessName,
        telephone: deal.businessPhone || undefined,
        address:
          deal.businessAddress || deal.businessCity
            ? {
                "@type": "PostalAddress",
                streetAddress: deal.businessAddress || undefined,
                addressLocality: deal.businessCity || undefined,
                addressCountry: "NZ",
              }
            : undefined,
      }
    : undefined;

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
            brand: deal.businessName ? { "@type": "Brand", name: deal.businessName } : undefined,
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
              seller,
            },
          }),
        }}
      />
      <DealDetail deal={deal} relatedDeals={relatedDeals} otherBusinessDeals={otherBusinessDeals} />
    </>
  );
}
