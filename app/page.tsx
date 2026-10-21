import Hero from "@/components/Hero";
import SearchAwareHero from "@/components/SearchAwareHero";
import HomeDeals from "./HomeDeals";
import { fetchAllLiveDealsServer, fetchTestBusinessDeals } from "@/lib/fetchDealServer";
import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_LAUNCHED, PRELAUNCH_HOME, DEALS_OPEN } from "@/lib/siteConfig";
import PrelaunchHome from "./PrelaunchHome";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { hasFilterParams, toSearchString } from "@/lib/homeFilters";
import { toCardDeal } from "@/lib/listingDeal";
import { isAdminViewer } from "@/lib/adminViewer";
import { INDEXABLE } from "@/lib/robotsMeta";

const HOME_TITLE = `${SITE_NAME} — Local Deals Up to 50% Off in Auckland & NZ`;
const HOME_DESCRIPTION =
  "Local deals up to 50% off at Auckland restaurants, spas, activities and getaways. No vouchers to buy — contact the business directly and pay them, not us.";

// Before launch (PRELAUNCH_HOME): what shoppers search for first (Auckland,
// the kinds of deal), then what's true now: free to use, and businesses
// list free. The earlier "coming to Auckland" title and a description
// written for businesses gave a shopper's search nothing to match (SEO
// audit of 19 Oct 2026).
const PRELAUNCH_TITLE = `Auckland Local Deals: Restaurants, Spas & More | ${SITE_NAME}`;
const PRELAUNCH_DESCRIPTION =
  "Auckland's new local deals site: restaurants, cafés, spas, activities and getaways near you. Free for shoppers, no vouchers to buy. Businesses list free now.";

// Before launch this is the public prelaunch homepage (PRELAUNCH_HOME,
// app/PrelaunchHome.tsx), or, with that switched off, reachable only by an
// admin (middleware.ts redirects "/" to /coming-soon). Used to inherit the root layout's generic
// defaults; this is the page most people will land on from search, so it
// gets its own. Search and filter views (/?q=…, ?category=…, ?type=…,
// ?price=…, ?view=map) are noindex: each is a thin, near-duplicate copy of the
// homepage, and there are hundreds of combinations. The canonical points
// them all back to "/", and the categories have their own indexable pages
// (/category/…), which is where the homepage's category links point.
export async function generateMetadata(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await props.searchParams;
  const filtered = hasFilterParams({ get: (k) => {
    const v = params[k];
    return typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? null) : null;
  } });
  const title = PRELAUNCH_HOME ? PRELAUNCH_TITLE : HOME_TITLE;
  const description = PRELAUNCH_HOME ? PRELAUNCH_DESCRIPTION : HOME_DESCRIPTION;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: SITE_URL },
    robots: filtered ? { index: false, follow: true } : INDEXABLE,
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_NZ",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// This page reads searchParams, so it renders on every request whatever
// `revalidate` says. The one-minute cache that keeps it fast lives on the
// deal listing itself (fetchAllLiveDealsServer): a deal approved, paused
// or sold out in the last minute can be up to 60s behind here.

export default async function HomePage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Passed down so the hero and deals render on the server with the
  // filters already applied (see lib/useUrlSearch.ts for why they don't
  // use useSearchParams).
  const initialSearch = toSearchString(await props.searchParams);
  const deals = await fetchAllLiveDealsServer();
  const listedDeals = deals.slice(0, 20);

  // Before launch: the public prelaunch homepage. The real deals go in the
  // structured data only once they're live (DEALS_OPEN); the example
  // deals never do.
  if (PRELAUNCH_HOME) {
    return (
      <>
        {DEALS_OPEN && listedDeals.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLd({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: `Live deals on ${SITE_NAME}`,
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
        <PrelaunchHome
          deals={deals.map(toCardDeal)}
          // A test business's deals are only for the owner to preview: shown
          // among the examples to a signed-in admin, never to the public.
          testDeals={(await isAdminViewer()) ? (await fetchTestBusinessDeals()).map(toCardDeal) : []}
          initialSearch={initialSearch}
          dealsLive={DEALS_OPEN}
        />
      </>
    );
  }

  return (
    <main className="bg-hp-page pb-2">
      {listedDeals.length > 0 && (
        <script
          type="application/ld+json"
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
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <HomeDeals initialDeals={deals.map(toCardDeal)} initialSearch={initialSearch} testDeals={!SITE_LAUNCHED} />
      </div>
    </main>
  );
}
