import { Suspense } from "react";
import type { Metadata } from "next";
import CategoryNav from "@/components/CategoryNav";
import { CATEGORIES } from "@/lib/categories";
import CategoryDeals from "./CategoryDeals";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";

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

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = decodeURIComponent(params.category);

  return (
    <main>
      <CategoryNav active={category} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-5 text-2xl font-extrabold text-slate-900">{category}</h1>
        <Suspense fallback={null}>
          <CategoryDeals category={category} />
        </Suspense>
      </div>
    </main>
  );
}
