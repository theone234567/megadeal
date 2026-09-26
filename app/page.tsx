import { Suspense } from "react";
import Hero from "@/components/Hero";
import CategoryNav from "@/components/CategoryNav";
import FlashDeals from "@/components/FlashDeals";
import SocialCTA from "@/components/SocialCTA";
import HowToUseStrip from "@/components/HowToUseStrip";
import HomeDeals from "./HomeDeals";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";

const HOME_TITLE = `${SITE_NAME} — Local Deals Up to 50% Off in Auckland & NZ`;
const HOME_DESCRIPTION =
  "Local deals up to 50% off at Auckland restaurants, spas, activities and getaways. No vouchers to buy — contact the business directly and pay them, not us.";

// Only reachable once SITE_LAUNCHED is on (middleware.ts redirects "/" to
// /coming-soon before that). Used to inherit the root layout's generic
// defaults; this is the page most people will land on from search, so it
// gets its own. Search results (/?q=…) are noindex: an indexed internal
// search page is thin, near-duplicate content in Google's eyes, and the
// canonical already points every variant back to "/".
export async function generateMetadata(props: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await props.searchParams;
  return {
    title: { absolute: HOME_TITLE },
    description: HOME_DESCRIPTION,
    alternates: { canonical: SITE_URL },
    robots: q?.trim() ? { index: false, follow: true } : undefined,
    openGraph: {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: SITE_URL,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_NZ",
    },
    twitter: { card: "summary_large_image", title: HOME_TITLE, description: HOME_DESCRIPTION },
  };
}

// Was force-dynamic (a live Wix API round-trip on every single page view,
// with no caching at all — the biggest single latency cost on the site).
// Deals aren't truly real-time: they go live via admin approval, expire on
// a schedule, and the site's own terms already say availability isn't
// guaranteed and is first-come-first-served — so a short cache window is
// a safe trade for a much faster response to most visitors. Worst case
// with a stale cache hit: a just-sold-out deal or a deal approved in the
// last minute is up to 60s behind, not a correctness bug.
export const revalidate = 60;

export default async function HomePage(
  props: {
    searchParams: Promise<{ q?: string }>;
  }
) {
  const searchParams = await props.searchParams;
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
      {/* Hero carries the page's only <h1> — while searching it's hidden
          (see below), so this sr-only fallback keeps exactly one <h1>
          present in that state too, rather than none at all. */}
      {isSearching && <h1 className="sr-only">{SITE_NAME} — search results</h1>}
      {!isSearching && <Hero />}
      {!isSearching && <FlashDeals initialDeals={deals} />}
      <CategoryNav />
      <div className="pt-6">
        <HowToUseStrip />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <HomeDeals initialDeals={deals} />
        </Suspense>
      </div>
      <SocialCTA />
    </main>
  );
}
