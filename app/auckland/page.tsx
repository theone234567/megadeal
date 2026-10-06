import type { Metadata } from "next";
import Link from "next/link";
import CategoryNav from "@/components/CategoryNav";
import HowToUseStrip from "@/components/HowToUseStrip";
import Breadcrumbs from "@/components/Breadcrumbs";
import DealGrid from "@/components/DealGrid";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import { CATEGORY_COPY } from "@/lib/categoryCopy";
import { DEFAULT_CITY, cityPath, flashDealsPath } from "@/lib/cities";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { SITE_LAUNCHED, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import type { Deal } from "@/lib/types";

/**
 * Every live deal in the city, by category: the page for searches like
 * "deals in Auckland" and "Auckland specials", and the hub the category
 * pages hang off (/auckland/food-drink …). Unlike the homepage, which is
 * built for browsing and filtering, this one is built to be read: plain
 * sections, a few deals each, and a link to the full list.
 */

export const revalidate = 60;

const CITY = DEFAULT_CITY.name;
const PER_SECTION = 4;

export async function generateMetadata(): Promise<Metadata> {
  const deals = await fetchAllLiveDealsServer();
  const title = `Deals in ${CITY} — Local Offers Up to 50% Off`;
  // Under 160 characters, so search results show it whole.
  const description = `Today's deals from ${CITY} businesses: food, beauty, activities, getaways, fitness and home services. Claim directly with the business; no coupons to buy.`;
  const url = `${SITE_URL}${cityPath()}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Empty, or before launch: kept out of search, like an empty category.
    robots: SITE_LAUNCHED && deals.length > 0 ? undefined : { index: false, follow: true },
    // The image named, as on flash deals: a page's own openGraph replaces
    // the layout's whole, so without it a shared link has no picture.
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url, siteName: SITE_NAME, type: "website", images: [`${SITE_URL}/opengraph-image`] },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images: [`${SITE_URL}/opengraph-image`] },
  };
}

function suburbCounts(deals: Deal[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const d of deals) if (d.businessSuburb) counts.set(d.businessSuburb, (counts.get(d.businessSuburb) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export default async function CityPage() {
  const deals = await fetchAllLiveDealsServer();
  const flash = deals.filter((d) => d.isFlash);
  const sections = CATEGORIES.map((c) => ({ c, deals: deals.filter((d) => d.categories.includes(c.name)) })).filter((s) => s.deals.length > 0);
  const suburbs = suburbCounts(deals);

  return (
    <main>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Deals in ${CITY}`,
            url: `${SITE_URL}${cityPath()}`,
            about: { "@type": "City", name: CITY, containedInPlace: { "@type": "Country", name: "New Zealand" } },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: deals.length,
              itemListElement: deals.slice(0, 30).map((d, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/deal/${d.slug}`, name: d.name })),
            },
          }),
        }}
      />
      <div className="mx-auto max-w-[1320px] px-4 pt-4 sm:px-6 lg:px-8">
        <CategoryNav mode="link" active="" />
      </div>
      <div className="pt-6">
        <HowToUseStrip />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ name: CITY }]} />
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Deals in {CITY}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {deals.length > 0
            ? `${deals.length} live ${deals.length === 1 ? "deal" : "deals"} from ${CITY} businesses right now. Each one is set by the business itself: pick one, then call, book or visit them and quote the deal code. You pay the business, not ${SITE_NAME}.`
            : `New deals from ${CITY} businesses are on the way. Check back soon.`}
        </p>

        {flash.length > 0 && (
          <section aria-labelledby="flash-heading" className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 id="flash-heading" className="font-display text-xl font-bold text-slate-900">
                Flash deals in {CITY}
              </h2>
              <Link href={flashDealsPath()} className="shrink-0 text-sm font-bold text-brand-700 hover:underline">
                View all flash deals →
              </Link>
            </div>
            <DealGrid deals={flash.slice(0, PER_SECTION)} />
          </section>
        )}

        {sections.map(({ c, deals: inCategory }) => (
          <section key={c.slug} aria-labelledby={`h-${c.slug}`} className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 id={`h-${c.slug}`} className="font-display text-xl font-bold text-slate-900">
                {CATEGORY_COPY[c.slug]?.h1 ?? `${c.name} deals in ${CITY}`}
              </h2>
              <Link href={categoryPath(c.name)} className="shrink-0 text-sm font-bold text-brand-700 hover:underline">
                View all {c.name} deals →
              </Link>
            </div>
            <DealGrid deals={inCategory.slice(0, PER_SECTION)} />
          </section>
        ))}

        {suburbs.length > 1 && (
          <section aria-labelledby="suburbs-heading" className="mt-12 max-w-3xl border-t border-slate-100 pt-8">
            <h2 id="suburbs-heading" className="font-display text-lg font-bold text-slate-900">
              Where the deals are
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {suburbs.map(([name, n], i) => `${name} (${n})${i < suburbs.length - 1 ? ", " : "."}`).join("")}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
