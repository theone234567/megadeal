import Hero from "@/components/Hero";
import SearchAwareHero from "@/components/SearchAwareHero";
import SocialCTA from "@/components/SocialCTA";
import HowToUseStrip from "@/components/HowToUseStrip";
import HomeDeals from "./HomeDeals";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { toSearchString } from "@/lib/homeFilters";

const HOME_TITLE = `${SITE_NAME} — Local Deals Up to 50% Off in Auckland & NZ`;
const HOME_DESCRIPTION =
  "Local deals up to 50% off at Auckland restaurants, spas, activities and getaways. No vouchers to buy — contact the business directly and pay them, not us.";

// Only reachable once SITE_LAUNCHED is on (middleware.ts redirects "/" to
// /coming-soon before that). Used to inherit the root layout's generic
// defaults; this is the page most people will land on from search, so it
// gets its own. Search and filter views (/?q=…, ?category=…, ?type=…,
// ?price=…) are noindex: each is a thin, near-duplicate copy of the
// homepage, and there are hundreds of combinations. The canonical points
// them all back to "/", and the categories have their own indexable pages
// (/category/…), which is where the homepage's category links point.
const FILTER_PARAMS = ["q", "city", "category", "type", "price", "sort", "within"];

export async function generateMetadata(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await props.searchParams;
  const filtered = FILTER_PARAMS.some((k) => {
    const v = params[k];
    return typeof v === "string" ? v.trim() !== "" : Array.isArray(v) && v.length > 0;
  });
  return {
    title: { absolute: HOME_TITLE },
    description: HOME_DESCRIPTION,
    alternates: { canonical: SITE_URL },
    robots: filtered ? { index: false, follow: true } : undefined,
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

export default async function HomePage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Passed down so the hero and deals render on the server with the
  // filters already applied (see lib/useUrlSearch.ts for why they don't
  // use useSearchParams).
  const initialSearch = toSearchString(await props.searchParams);
  const deals = await fetchAllLiveDealsServer();
  const listedDeals = deals.slice(0, 20);

  return (
    <main className="bg-hp-page pb-2">
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
      {/* The hero carries the page's <h1>; while searching it's hidden and
          the results supply one instead (app/HomeDeals.tsx). Filters live
          in the URL and are applied in the browser from the deals fetched
          here. */}
      <SearchAwareHero initialSearch={initialSearch}>
        <Hero />
      </SearchAwareHero>
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <HomeDeals initialDeals={deals} initialSearch={initialSearch} />
      </div>
      <div className="mt-10">
        <HowToUseStrip />
      </div>
      <SocialCTA />
    </main>
  );
}
