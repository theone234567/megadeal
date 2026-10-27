import type { Metadata } from "next";
import Link from "next/link";
import { ORGANIZATION_ID, SITE_LAUNCHED, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { displayFont, plusJakartaSans } from "@/lib/fonts";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { pageMetadata } from "@/lib/pageMetadata";
import { CONTENT_UPDATED } from "@/lib/sitemapDates";
import PageHero from "@/components/PageHero";

/**
 * "GrabOne alternatives" (SEO plan, page B): what the main local deal sites
 * in New Zealand do, side by side. Fair to each one: what it's good for, in
 * neutral words, and nothing about anyone's prices or fees, which change and
 * are theirs to state. Every fact about GrabOne is sourced. Not the "old
 * GrabOne vouchers" question, which the owner chose not to answer on the
 * site. Re-check the facts and bump CONTENT_UPDATED["/grabone-alternatives"]
 * when the wording changes.
 */
const PATH = "/grabone-alternatives";
const CHECKED = CONTENT_UPDATED[PATH];
// A calendar date, so formatted as one (in NZ time it would move a day).
const CHECKED_LABEL = new Date(`${CHECKED}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const metadata: Metadata = pageMetadata({
  title: "GrabOne Alternatives in NZ: Local Deal Sites",
  description:
    "The main alternatives to GrabOne in New Zealand, compared: how each local deal site works and what it's best for, including free deal codes in Auckland.",
  path: PATH,
});

const SOURCES = [
  { name: "1News: Operator of deal website GrabOne in liquidation (October 2025)", url: "https://www.1news.co.nz/2025/10/16/operator-of-deal-website-grabone-in-liquidation/" },
  { name: "1News: GrabOne returns from liquidation under new Kiwi ownership (March 2026)", url: "https://www.1news.co.nz/2026/03/03/grabone-returns-from-liquidation-under-new-kiwi-ownership/" },
  { name: "Stuff: GrabOne to relaunch under Kiwi ownership (March 2026)", url: "https://www.stuff.co.nz/business/360937046/grabone-relaunch-under-kiwi-ownership-nearly-five-months-after-going-liquidation" },
];

const MEGADEAL_STATUS = SITE_LAUNCHED ? "Live in Auckland." : "Launching soon in Auckland.";

const SITES = [
  {
    name: "GrabOne",
    url: "https://www.grabone.co.nz/",
    how: "Buy a discount voucher online, then use it at the business.",
    bestFor: "Vouchers for dining, activities, beauty and getaways.",
  },
  {
    name: "First Table",
    url: "https://www.firsttable.co.nz/",
    how: "Book an early or late table at a participating restaurant for a discount on the food bill.",
    bestFor: "Eating out at quieter times.",
  },
  {
    name: "Bookme",
    url: "https://www.bookme.co.nz/",
    how: "Book discounted activities, attractions and tours.",
    bestFor: "Things to do and travel around New Zealand.",
  },
  {
    name: SITE_NAME,
    url: null,
    how: "Get a free deal code, quote it when you book or visit, and pay the business directly at the deal price.",
    bestFor: `Auckland restaurants, spas, massage, nails and activities, with nothing to pay up front. ${MEGADEAL_STATUS}`,
  },
];

const ANSWER = `The main alternatives to GrabOne in New Zealand are First Table for restaurant tables, Bookme for activities and tours, and ${SITE_NAME} for free deal codes from local businesses in Auckland. GrabOne itself is running again: its operator went into liquidation in October 2025, and GrabOne relaunched under new New Zealand ownership in March 2026.`;

const FAQS = [
  { q: "What are the alternatives to GrabOne in New Zealand?", a: ANSWER },
  {
    q: "Is GrabOne still running?",
    a: "Yes. GrabOne's operator went into liquidation in October 2025, and GrabOne relaunched under new New Zealand ownership in March 2026.",
  },
  {
    q: "Is MegaDeal connected with GrabOne?",
    a: "No. MegaDeal is run by MegaDeal Limited, a New Zealand-owned company, and isn't connected with GrabOne or any other deals site.",
  },
  {
    q: "How is MegaDeal different from GrabOne?",
    a: "With GrabOne, you buy a voucher online first, then use it at the business. With MegaDeal the deal code is free: you contact the business and pay them directly at the deal price. You never pay up front, so there's no voucher money to lose if a website or business closes.",
  },
];

// Useful whichever site someone picks: the things that matter when a deal
// goes wrong.
const CHECKS = [
  "Who you pay, and when: the deals site up front, or the business on the day.",
  "What happens to your money if the business or the website closes.",
  "The expiry date, and whether you need to book ahead.",
  "What the price includes, and any days or times it can't be used.",
];

export default function GrabOneAlternativesPage() {
  return (
    <main className={plusJakartaSans.className}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Article",
                "@id": `${SITE_URL}${PATH}#article`,
                headline: "GrabOne alternatives in New Zealand",
                description: ANSWER,
                url: `${SITE_URL}${PATH}`,
                inLanguage: "en-NZ",
                datePublished: "2026-10-27",
                dateModified: CHECKED,
                author: { "@id": ORGANIZATION_ID },
                publisher: { "@id": ORGANIZATION_ID },
                citation: SOURCES.map((s) => s.url),
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
                  { "@type": "ListItem", position: 2, name: "GrabOne alternatives", item: `${SITE_URL}${PATH}` },
                ],
              },
            ],
          }),
        }}
      />

      <PageHero crumb="GrabOne alternatives" title="GrabOne alternatives in New Zealand">
        How the main local deal sites work, and what each one is best for.
      </PageHero>

      {/* The answer first, for people and for AI tools that quote it. */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-lg leading-relaxed text-slate-700">
            The main alternatives to GrabOne in New Zealand are <strong>First Table</strong> for restaurant tables,{" "}
            <strong>Bookme</strong> for activities and tours, and <strong>{SITE_NAME}</strong> for free deal codes from
            local businesses in Auckland. GrabOne itself is running again: its operator went into liquidation in October
            2025, and GrabOne relaunched under new New Zealand ownership in March 2026 (
            <a href={SOURCES[1].url} className="font-semibold text-brand-600 hover:underline" rel="noopener">
              1News
            </a>
            ).
          </p>
          <p className="mt-3 text-sm text-slate-500">Last checked {CHECKED_LABEL}.</p>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${displayFont.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>Local deal sites compared</h2>
          <ul className="mt-6 space-y-4">
            {SITES.map((s) => (
              <li key={s.name} className={`rounded-2xl border p-5 ${s.url ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"}`}>
                <h3 className="text-base font-bold text-slate-900">
                  {s.url ? (
                    <a href={s.url} className="text-brand-600 hover:underline" rel="nofollow noopener">
                      {s.name}
                    </a>
                  ) : (
                    <>{s.name} (this site)</>
                  )}
                </h3>
                <dl className="mt-2 space-y-1 text-sm leading-relaxed text-slate-600">
                  <div>
                    <dt className="inline font-semibold text-slate-800">How it works: </dt>
                    <dd className="inline">{s.how}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-slate-800">Best for: </dt>
                    <dd className="inline">{s.bestFor}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">Each site sets its own offers and terms; check theirs before you book.</p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${displayFont.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>What to check before you use any deal</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-600">
            {CHECKS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-4 text-slate-600">
            On {SITE_NAME} there&apos;s nothing to pay up front: you pay the business directly, on the day.{" "}
            <Link href="/how-it-works" className="font-semibold text-brand-600 hover:underline">
              See how it works
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${displayFont.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>For businesses</h2>
          <p className="mt-3 text-slate-600">
            Looking for another way to bring in new customers? {SITE_NAME} takes 0% commission: customers book and pay
            you directly.{" "}
            <Link href="/list-your-business" className="font-semibold text-brand-600 hover:underline">
              See how to list your business
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${displayFont.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>Questions</h2>
          <div className="mt-6 space-y-6">
            {FAQS.slice(1).map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-bold text-slate-900">{f.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-600">
            Looking for Groupon?{" "}
            <Link href="/groupon-nz" className="font-semibold text-brand-600 hover:underline">
              It closed in New Zealand in 2020
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${displayFont.className} text-xl font-bold text-slate-900`}>Sources</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} className="text-brand-600 hover:underline" rel="noopener">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            GrabOne, First Table and Bookme are trademarks of their owners. {SITE_NAME} isn&apos;t connected with them and
            uses the names only to compare how the sites work.
          </p>
        </div>
      </section>
    </main>
  );
}
