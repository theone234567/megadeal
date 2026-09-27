import type { MetadataRoute } from "next";
import { SITE_URL, SITE_LAUNCHED, MEGASHOP_LAUNCHED } from "@/lib/siteConfig";
import {
  fetchAllLiveDealSlugsForSitemap,
  fetchAllBusinessSlugsForSitemap,
} from "@/lib/fetchDealServer";
import { fetchMegaShopProductsForServer } from "@/lib/fetchMegaShopServer";
import { CATEGORIES, categoryPath } from "@/lib/categories";

// Deals are created/edited by merchants continuously, so a build-time-only
// static sitemap would go stale between deploys. Regenerate hourly instead.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    // While pre-launch (middleware.ts redirects "/" to /coming-soon),
    // submitting the bare "/" here would just hand crawlers a redirect
    // stub — point them at the real front door instead. Flips back
    // automatically once SITE_LAUNCHED is set, no manual edit needed.
    {
      url: SITE_LAUNCHED ? SITE_URL : `${SITE_URL}/coming-soon`,
      changeFrequency: "hourly",
      priority: 1,
    },
    { url: `${SITE_URL}/list-your-business`, changeFrequency: "weekly", priority: 0.6 },
    // Same unconditional bucket as /list-your-business, not gated behind
    // SITE_LAUNCHED — it targets restaurant owners considering signup,
    // not consumers, so it's fine (and intended) to be findable pre-launch.
    { url: `${SITE_URL}/advertise/restaurants`, changeFrequency: "weekly", priority: 0.5 },
    // Same reasoning, same bucket — targets beauty/spa business owners.
    { url: `${SITE_URL}/advertise/beauty-spa`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/redeem`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/help`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/careers`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/refund-policy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // MegaShop is gated by its own separate flag, not SITE_LAUNCHED — same
  // robots:{index:false} gate as its own generateMetadata while not
  // launched (see app/megashop/page.tsx and app/megashop/[slug]/page.tsx),
  // so only submit these once MEGASHOP_LAUNCHED is actually true.
  const megaShopPages: MetadataRoute.Sitemap = [];
  if (MEGASHOP_LAUNCHED) {
    megaShopPages.push({ url: `${SITE_URL}/megashop`, changeFrequency: "daily", priority: 0.6 });
    const products = await fetchMegaShopProductsForServer();
    megaShopPages.push(
      ...products.map((p) => ({
        url: `${SITE_URL}/megashop/${p.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.6,
      }))
    );
  }

  // These pages carry a matching robots:{index:false} in their own
  // generateMetadata while !SITE_LAUNCHED (they're reachable directly
  // even though "/" redirects to /coming-soon), so don't hand crawlers a
  // sitemap full of URLs they're not allowed to index — submit them only
  // once the site has actually launched.
  if (!SITE_LAUNCHED) {
    return [...staticPages, ...megaShopPages];
  }

  const deals = await fetchAllLiveDealSlugsForSitemap();
  const dealPages: MetadataRoute.Sitemap = deals.map((d) => ({
    url: `${SITE_URL}/deal/${d.slug}`,
    lastModified: d.updatedAt ?? undefined,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // A listing page changes when one of its deals does, so it's dated by
  // its newest deal. Bing leans on these dates to decide what to recrawl;
  // leaving them off (or stamping every page with "now") teaches it to
  // ignore them.
  const newest = (dates: (string | null)[]) =>
    dates.filter((d): d is string => Boolean(d)).sort().at(-1) ?? undefined;

  // Only categories with a live deal — an empty one is noindexed on its
  // own page (app/category/[category]/page.tsx), so listing it here
  // would hand Google a URL it's told not to index.
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.flatMap((c) => {
    const inCategory = deals.filter((d) => d.categories.includes(c.name));
    if (inCategory.length === 0) return [];
    return [
      {
        url: `${SITE_URL}${categoryPath(c.name)}`,
        lastModified: newest(inCategory.map((d) => d.updatedAt)),
        changeFrequency: "daily" as const,
        priority: 0.7,
      },
    ];
  });

  const businesses = await fetchAllBusinessSlugsForSitemap();
  const businessPages: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: `${SITE_URL}/business/${b.slug}`,
    lastModified: newest([b.updatedAt, ...deals.filter((d) => d.merchantEmail === b.email).map((d) => d.updatedAt)]),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  // /flash-deals draws from the same live-deal catalog as the pages above,
  // and carries the same pre-launch robots:{index:false} gate — belongs
  // here, not in the unconditional staticPages list above.
  const flashDealsPage: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/flash-deals`, changeFrequency: "hourly", priority: 0.6 },
  ];

  return [
    ...staticPages,
    ...categoryPages,
    ...dealPages,
    ...businessPages,
    ...flashDealsPage,
    ...megaShopPages,
  ];
}
