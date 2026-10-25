import { Suspense } from "react";
import { DEFAULT_CITY, flashDealsPath } from "@/lib/cities";
import type { Metadata } from "next";
import CategoryNav from "@/components/CategoryNav";
import HowToUseStrip from "@/components/HowToUseStrip";
import FlashDealsList from "./FlashDealsList";
import { SITE_URL, SITE_NAME, DEALS_OPEN } from "@/lib/siteConfig";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { toCardDeal } from "@/lib/listingDeal";
import { INDEXABLE } from "@/lib/robotsMeta";

// Rendered for each request, never at build time: the build can't see the
// switches in wrangler.toml [vars] (DATA_BACKEND is runtime-only) or reach
// the database, so a build-time copy would hold Wix's data, or none, until
// it was next refreshed. The deal listing it reads keeps its own one-minute
// cache (fetchAllLiveDealsServer), as the homepage does.
export const dynamic = "force-dynamic";

// No "| SITE_NAME" suffix on `title` — the root layout's title.template
// already appends "| MegaDeal". openGraph/twitter titles aren't run
// through that template, so those keep the brand-inclusive version.
export async function generateMetadata(): Promise<Metadata> {
  // Indexed only while there's a live flash deal to show, like the city
  // and category pages: an empty listing is a thin page. The same cached
  // read the page itself makes.
  const deals = await fetchAllLiveDealsServer().catch(() => []);
  const hasFlash = deals.some((d) => d.isFlash);
  // The same title and description everywhere they're shown (T234).
  const title = `Flash Deals in ${DEFAULT_CITY.name} — Short-Burst Offers`;
  const description = `All of ${SITE_NAME}'s current flash deals in one place — short-burst offers that end fast, so grab them while they last.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${flashDealsPath()}` },
    // Pre-launch, "/" redirects to /coming-soon so visitors never see a
    // demo-data-filled deal grid (see DEALS_OPEN in lib/siteConfig.ts)
    // — but this page is reachable directly regardless, so it needs the
    // same protection: no browse page should get indexed while the
    // catalog might still hold pre-launch test data.
    robots: DEALS_OPEN && hasFlash ? INDEXABLE : { index: false, follow: true },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      locale: "en_NZ",
      url: `${SITE_URL}${flashDealsPath()}`,
      siteName: SITE_NAME,
      type: "website",
      // Named explicitly. Every other page picks up app/opengraph-image.tsx
      // automatically, but this route's own openGraph block was resolving
      // without any image, so a shared link came through as a bare grey card
      // — the one context where the picture is most of the click.
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

export default async function FlashDealsPage() {
  const deals = await fetchAllLiveDealsServer();
  const flashDeals = deals.filter((d) => d.isFlash).slice(0, 20);

  return (
    <main>
      <div className="mx-auto max-w-[1320px] px-4 pt-4 sm:px-6 lg:px-8">
        <CategoryNav mode="link" active="" />
      </div>
      {flashDeals.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `Flash deals on ${SITE_NAME}`,
              itemListElement: flashDeals.map((d, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}/deal/${d.slug}`,
                name: d.name,
              })),
            }),
          }}
        />
      )}
      <div className="bg-brand-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-white">
            ⚡ Flash Deals
          </h1>
          <p className="mt-1 text-sm text-brand-100">
            Short-burst offers that end fast — grab them while they last.
          </p>
        </div>
      </div>
      <div className="pt-6">
        <HowToUseStrip />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Space held while the deals arrive, so the footer doesn't jump. */}
        <Suspense fallback={<div className="min-h-screen" aria-hidden="true" />}>
          <FlashDealsList initialDeals={deals.filter((d) => d.isFlash).map(toCardDeal)} testDeals={!DEALS_OPEN} />
        </Suspense>
      </div>
    </main>
  );
}
