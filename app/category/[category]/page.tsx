import { Suspense } from "react";
import type { Metadata } from "next";
import CategoryNav from "@/components/CategoryNav";
import { CATEGORIES } from "@/lib/categories";
import CategoryDeals from "./CategoryDeals";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.name }));
}

export function generateMetadata({
  params,
}: {
  params: { category: string };
}): Metadata {
  const category = decodeURIComponent(params.category);
  const title = `${category} Deals — Up to 70% Off | ${SITE_NAME}`;
  const description = `Browse today's best ${category} deals in New Zealand. Save up to 70% at real local businesses — new deals added daily.`;
  const url = `${SITE_URL}/category/${encodeURIComponent(category)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = decodeURIComponent(params.category);
  const deals = await fetchAllLiveDealsServer();

  // Same live+category filter CategoryDeals.tsx applies client-side, kept
  // in sync here just for the structured-data list below — capped since
  // this describes "what's on this page", not a full catalog dump.
  const categoryDeals = deals.filter((d) => d.categories.includes(category)).slice(0, 20);

  return (
    <main>
      <CategoryNav active={category} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {categoryDeals.length > 0 && (
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: `${category} deals on ${SITE_NAME}`,
                itemListElement: categoryDeals.map((d, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `${SITE_URL}/deal/${d.slug}`,
                  name: d.name,
                })),
              }),
            }}
          />
        )}
        <h1 className="mb-5 text-2xl font-extrabold text-slate-900">{category}</h1>
        <Suspense fallback={null}>
          <CategoryDeals category={category} initialDeals={deals} />
        </Suspense>
      </div>
    </main>
  );
}
