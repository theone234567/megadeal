import { Suspense } from "react";
import type { Metadata } from "next";
import CategoryNav from "@/components/CategoryNav";
import HowToUseStrip from "@/components/HowToUseStrip";
import FlashDealsList from "./FlashDealsList";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { safeJsonLd } from "@/lib/safeJsonLd";

// See app/page.tsx for why this is a short revalidate window rather than
// force-dynamic. Flash deals are short-lived by nature, so this stays
// tighter than the other browse pages.
export const revalidate = 30;

export const metadata: Metadata = {
  title: `Flash Deals — Short-Burst Offers | ${SITE_NAME}`,
  description: `All of ${SITE_NAME}'s current flash deals in one place — short-burst offers that end fast, so grab them while they last.`,
  alternates: { canonical: `${SITE_URL}/flash-deals` },
  openGraph: {
    title: `Flash Deals | ${SITE_NAME}`,
    description: "Short-burst offers that end fast — grab them while they last.",
    url: `${SITE_URL}/flash-deals`,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary", title: `Flash Deals | ${SITE_NAME}` },
};

export default async function FlashDealsPage() {
  const deals = await fetchAllLiveDealsServer();
  const flashDeals = deals.filter((d) => d.isFlash).slice(0, 20);

  return (
    <main>
      <CategoryNav />
      {flashDeals.length > 0 && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
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
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white">
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
        <Suspense fallback={null}>
          <FlashDealsList initialDeals={deals} />
        </Suspense>
      </div>
    </main>
  );
}
