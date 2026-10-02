import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryNav from "@/components/CategoryNav";
import HowToUseStrip from "@/components/HowToUseStrip";
import Breadcrumbs from "@/components/Breadcrumbs";
import { categoryBySlug, categoryPath } from "@/lib/categories";
import CategoryDeals from "./CategoryDeals";
import { SITE_URL, SITE_NAME, SITE_LAUNCHED } from "@/lib/siteConfig";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { CATEGORY_COPY, SEO_REGION } from "@/lib/categoryCopy";

// See app/page.tsx for why this is a short revalidate window rather than
// force-dynamic.
export const revalidate = 60;

// Deliberately NOT using generateStaticParams here (this page used to be
// statically prerendered at build time) — CategoryDeals is a client
// component that reads useSearchParams() for the ?city= filter, and a
// statically-prerendered shell can never know query params at build time.
// The practical effect: the entire deal grid (and everything below the H1)
// was silently missing from the server-rendered HTML on every request,
// only ever appearing after client-side hydration — invisible to any
// crawler that doesn't execute JavaScript (most AI crawlers included).
// Removing static prerendering makes this a normal per-request dynamic
// render instead, so real search params (and the real content) are always
// part of the HTML response. `revalidate` above still caches it the same
// way a fully dynamic route would.

export async function generateMetadata(
  props: {
    params: Promise<{ category: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const def = categoryBySlug(params.category);
  if (!def) return { title: "Category not found" };
  const category = def.name;
  const copy = CATEGORY_COPY[def.slug];
  // No "| SITE_NAME" suffix here — the root layout's title.template
  // already appends "| MegaDeal", so including it here doubled it up.
  // openGraph/twitter titles aren't run through that template, so those
  // keep the brand-inclusive version.
  // In the words people search ("restaurant deals Auckland"), from
  // lib/categoryCopy.ts; the category's own name only as a fallback.
  const title = copy?.title ?? `${category} Deals in ${SEO_REGION} — Up to 50% Off`;
  const socialTitle = `${title} | ${SITE_NAME}`;
  const description =
    copy?.description ??
    `Browse today's best ${category} deals in ${SEO_REGION}. Save up to 50% at real local businesses — new deals added daily.`;
  const url = `${SITE_URL}${categoryPath(category)}`;
  // A category with no live deals is an empty page — kept out of Google
  // (and the sitemap) until it has something in it, so thin pages don't
  // count against the rest of the site.
  const hasDeals = (await fetchAllLiveDealsServer()).some((d) => d.categories.includes(category));

  return {
    title,
    description,
    alternates: { canonical: url },
    // Pre-launch, "/" redirects to /coming-soon so visitors never see a
    // demo-data-filled deal grid (see SITE_LAUNCHED in lib/siteConfig.ts)
    // — but this page is reachable directly regardless, so it needs the
    // same protection: no category page should get indexed while the
    // catalog might still hold pre-launch test data.
    robots: SITE_LAUNCHED && hasDeals ? undefined : { index: false, follow: true },
    openGraph: { title: socialTitle, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary", title: socialTitle, description },
  };
}

export default async function CategoryPage(
  props: {
    params: Promise<{ category: string }>;
  }
) {
  const params = await props.params;
  // The route matches any string, but only the slugs in lib/categories.ts
  // are real — anything else (a typo'd link, a scraped/guessed URL)
  // previously rendered a 200-status page with an empty deal grid, a
  // classic soft-404 that wastes crawl budget and can end up indexed as
  // junk. Old percent-encoded-name URLs never reach here: middleware.ts
  // 308-redirects them to the slug form first.
  const def = categoryBySlug(params.category);
  if (!def) notFound();
  const category = def.name;
  const copy = CATEGORY_COPY[def.slug];

  const deals = await fetchAllLiveDealsServer();

  // Same live+category filter CategoryDeals.tsx applies client-side, kept
  // in sync here just for the structured-data list below — capped since
  // this describes "what's on this page", not a full catalog dump.
  const categoryDeals = deals.filter((d) => d.categories.includes(category)).slice(0, 20);

  return (
    <main>
      <div className="mx-auto max-w-[1320px] px-4 pt-4 sm:px-6 lg:px-8">
        <CategoryNav mode="link" active={def.slug} />
      </div>
      <div className="pt-6">
        <HowToUseStrip />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {categoryDeals.length > 0 && (
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: safeJsonLd({
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
        <Breadcrumbs items={[{ name: category }]} />
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {copy ? copy.h1 : `${category} deals in ${SEO_REGION}`}
        </h1>
        {copy && <p className="mt-1.5 mb-5 max-w-2xl text-sm text-slate-600 sm:text-base">{copy.intro}</p>}
        {!copy && <div className="mb-5" />}
        <Suspense fallback={null}>
          <CategoryDeals category={category} initialDeals={deals} />
        </Suspense>
        {copy && (
          <section className="mt-12 max-w-2xl border-t border-slate-100 pt-8">
            <h2 className="font-display text-lg font-bold text-slate-900">{copy.more.heading}</h2>
            {copy.more.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="mt-3 text-sm leading-relaxed text-slate-600">
                {p}
              </p>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
