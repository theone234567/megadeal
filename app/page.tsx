import { Suspense } from "react";
import Hero from "@/components/Hero";
import CategoryNav from "@/components/CategoryNav";
import FlashDeals from "@/components/FlashDeals";
import SocialCTA from "@/components/SocialCTA";
import HomeDeals from "./HomeDeals";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const isSearching = Boolean(searchParams.q?.trim());
  const deals = await fetchAllLiveDealsServer();
  const listedDeals = deals.slice(0, 20);

  return (
    <main>
      {listedDeals.length > 0 && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `Today's deals on ${SITE_NAME}`,
              itemListElement: listedDeals.map((d, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}/deal/${d.slug}`,
                name: d.name,
              })),
            }),
          }}
        />
      )}
      {!isSearching && <Hero />}
      {!isSearching && <FlashDeals initialDeals={deals} />}
      <CategoryNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <HomeDeals initialDeals={deals} />
        </Suspense>
      </div>
      <SocialCTA />
    </main>
  );
}
