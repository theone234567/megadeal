import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import DealDetail from "./DealDetail";
import MoreDeals from "./MoreDeals";
import EndedDeal from "./EndedDeal";
import { fetchDealForSEO, fetchEndedDeal, fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { SITE_URL, SITE_NAME, SITE_LAUNCHED } from "@/lib/siteConfig";
import { formatMoney, truncateForMeta } from "@/lib/format";
import { placeLabel } from "@/lib/location";
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
  deal: { name: string; description: string; discountPercent: number; was: number; now: number; currency: string | null; formattedWas: string | null; businessName: string | null; businessCity: string | null; businessSuburb: string | null },
  price: string
): string {
  const place = placeLabel(deal.businessSuburb, deal.businessCity);
  const where = [deal.businessName ? `at ${deal.businessName}` : "", place ? `in ${place}` : ""]
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
  // A failed read is the page's to report (its error screen); the title
  // just stays generic rather than failing twice.
  const deal = await fetchDealForSEO(params.slug).catch(() => undefined);
  if (deal === undefined) return { title: "Deal" };
  if (!deal) {
    // A deal that has ended keeps its page (see EndedDeal), but not in
    // search results: noindex drops it, and "follow" still lets crawlers
    // reach the business and the live deals it links to.
    const ended = await fetchEndedDeal(params.slug).catch(() => null);
    if (ended) {
      return {
        title: `${ended.name}${ended.businessName ? ` at ${ended.businessName}` : ""} — deal ended`,
        description: truncateForMeta(
          `This deal has ended.${ended.businessName ? ` See ${ended.businessName}'s current deals` : " See current deals"} on ${SITE_NAME}.`
        ),
        robots: { index: false, follow: true },
      };
    }
    return { title: "Deal not found" };
  }

  const price = formatMoney(deal.now, deal.currency, deal.formattedNow);
  // Where, as specifically as it's known ("at Harbour & Hearth, Takapuna,
  // Auckland"): the title is what search results show and match most, and
  // people search for things near a place ("pizza Takapuna").
  const place = placeLabel(deal.businessSuburb, deal.businessCity);
  const businessSuffix = deal.businessName
    ? ` at ${deal.businessName}${place ? `, ${place}` : ""}`
    : place
      ? ` in ${place}`
      : "";
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
  // Start reading the site's other deals now, alongside this one, rather
  // than after it: MoreDeals below picks up this same read (it's wrapped
  // in cache()). It never throws — a failure comes back as no deals.
  void fetchAllLiveDealsServer();
  const deal = await fetchDealForSEO(params.slug);
  if (!deal) {
    // Over (expired, sold out, paused or taken down) but once published:
    // an old link still leads somewhere useful. Never published, or
    // unknown: not found, as before.
    const ended = await fetchEndedDeal(params.slug);
    if (!ended) notFound();
    return (
      <EndedDeal
        deal={ended}
        moreDeals={
          <Suspense fallback={null}>
            <MoreDeals deal={ended} />
          </Suspense>
        }
      />
    );
  }

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
          deal.businessAddress || deal.businessCity || deal.businessSuburb
            ? {
                "@type": "PostalAddress",
                streetAddress: deal.businessAddress || undefined,
                // The suburb as the locality, the city as the region, when
                // both are known ("Takapuna", "Auckland").
                addressLocality: deal.businessSuburb || deal.businessCity || undefined,
                addressRegion: deal.businessSuburb ? deal.businessCity || undefined : undefined,
                addressCountry: "NZ",
              }
            : undefined,
        // The pin the business set on its map, when it has one.
        geo:
          typeof deal.businessLat === "number" && typeof deal.businessLng === "number"
            ? { "@type": "GeoCoordinates", latitude: deal.businessLat, longitude: deal.businessLng }
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
      <DealDetail
        deal={deal}
        moreDeals={
          // Its own boundary: the deal shows as soon as it's read, and the
          // lists of other deals follow when they're ready.
          <Suspense fallback={null}>
            <MoreDeals deal={deal} />
          </Suspense>
        }
      />
    </>
  );
}
