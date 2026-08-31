import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";
import {
  fetchAllLiveDealSlugsForSitemap,
  fetchAllBusinessSlugsForSitemap,
} from "@/lib/fetchDealServer";
import { CATEGORIES } from "@/lib/categories";

// Deals are created/edited by merchants continuously, so a build-time-only
// static sitemap would go stale between deploys. Regenerate hourly instead.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/businesses`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/category/${encodeURIComponent(c.name)}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const deals = await fetchAllLiveDealSlugsForSitemap();
  const dealPages: MetadataRoute.Sitemap = deals.map((d) => ({
    url: `${SITE_URL}/deal/${d.slug}`,
    lastModified: d.updatedAt ?? undefined,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const businessSlugs = await fetchAllBusinessSlugsForSitemap();
  const businessPages: MetadataRoute.Sitemap = businessSlugs.map((slug) => ({
    url: `${SITE_URL}/business/${slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticPages, ...categoryPages, ...dealPages, ...businessPages];
}
