import type { Metadata } from "next";
import Link from "next/link";
import { ORGANIZATION_ID, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { displayFont, plusJakartaSans } from "@/lib/fonts";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { pageMetadata } from "@/lib/pageMetadata";
import { CONTENT_UPDATED } from "@/lib/sitemapDates";
import PageHero from "@/components/PageHero";

/**
 * "Is Groupon still in NZ?" (T254): people still search for Groupon in New
 * Zealand years after it left, and the page that answers them is a 2020
 * news story. A plain, dated, sourced answer, then how local deals work
 * now. Facts only, each one linked; no claim about any other company's
 * fees, and no suggestion of a link with Groupon. Re-check the facts and
 * bump CONTENT_UPDATED["/groupon-nz"] when the wording changes.
 */
const PATH = "/groupon-nz";
const CHECKED = CONTENT_UPDATED[PATH];
const PUBLISHED = "2026-10-26";
// A calendar date, so formatted as one (in NZ time it would move a day).
const CHECKED_LABEL = new Date(`${CHECKED}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const metadata: Metadata = pageMetadata({
  title: "Is Groupon Still in NZ? No, It Closed in 2020",
  description:
    "Groupon closed its New Zealand business in August 2020. What happened to its vouchers, and the alternatives for local deals in NZ now, like free deal codes.",
  path: PATH,
  article: { published: PUBLISHED, modified: CHECKED },
});

const SOURCES = [
  { name: "RNZ: Groupon closing its New Zealand business (2020)", url: "https://www.rnz.co.nz/news/business/423237/groupon-closing-its-new-zealand-business" },
  { name: "Stuff: Groupon says it has closed its New Zealand business (2020)", url: "https://www.stuff.co.nz/business/industries/122407442/groupon-says-it-has-closed-its-new-zealand-business" },
  { name: "NZ Herald: Daily deals website Groupon closes New Zealand business (2020)", url: "https://www.nzherald.co.nz/business/daily-deals-website-groupon-closes-new-zealand-business/CY4CHGGKB43HA6WFZ56KPVAAPU/" },
];

const ANSWER =
  "No. Groupon closed its New Zealand business in August 2020 and no longer sells deals here. Vouchers bought before then could be used until 30 September 2020; after that, unused ones could be refunded through Groupon.";

// The other half of a "groupon nz" search: what people use instead. What
// each one offers, in neutral words; nothing about their prices or fees,
// which change and are theirs to state.
const ALTERNATIVES = [
  {
    name: "GrabOne",
    url: "https://www.grabone.co.nz/",
    what: "A New Zealand deals site: buy a discount voucher online for dining, activities, beauty or getaways, then use it at the business.",
  },
  {
    name: "First Table",
    url: "https://www.firsttable.co.nz/",
    what: "Book an early or late table at a participating restaurant for a discount on the food bill.",
  },
  {
    name: "Bookme",
    url: "https://www.bookme.co.nz/",
    what: "Book discounted activities, attractions and tours around New Zealand.",
  },
  {
    name: SITE_NAME,
    url: null,
    what: "Free deal codes from local businesses, starting in Auckland: restaurants, spas, activities and more. Quote the code when you book or visit, and pay the business directly.",
  },
];

const ALTERNATIVES_FAQ = {
  q: "What are the alternatives to Groupon in New Zealand?",
  a: `Since Groupon left in 2020, Kiwis find local deals on sites such as GrabOne (discount vouchers bought online for dining, activities, beauty and getaways), First Table (a discount on the food bill for early or late restaurant tables), Bookme (discounted activities, attractions and tours) and ${SITE_NAME} (free deal codes from local businesses, starting in Auckland: you quote the code and pay the business directly).`,
};

const FAQS = [
  { q: "Is Groupon still in New Zealand?", a: ANSWER },
  {
    q: "Is MegaDeal connected with Groupon?",
    a: "No. MegaDeal is run by MegaDeal Limited, a New Zealand-owned company, and isn't connected with Groupon or any other deals site.",
  },
  {
    q: "How is MegaDeal different from a voucher site?",
    a: "With a voucher site, you buy a voucher online first, then use it at the business. With MegaDeal the deal code is free: you contact the business and pay them directly at the deal price. You never pay up front, so there's no voucher money to lose if a website or business closes.",
  },
];

const TIMELINE = [
  { when: "2011", what: "Groupon launches in New Zealand and Australia, selling discount vouchers online." },
  { when: "August 2020", what: "Groupon closes its New Zealand business and stops offering new deals here." },
  { when: "30 September 2020", what: "The last day to use a valid Groupon NZ voucher. Unused ones could then be refunded through Groupon." },
];

export default function GrouponNzPage() {
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
                headline: "Is Groupon still in New Zealand?",
                description: ANSWER,
                url: `${SITE_URL}${PATH}`,
                inLanguage: "en-NZ",
                datePublished: PUBLISHED,
                dateModified: CHECKED,
                author: { "@id": ORGANIZATION_ID },
                publisher: { "@id": ORGANIZATION_ID },
                citation: SOURCES.map((s) => s.url),
              },
              {
                "@type": "FAQPage",
                mainEntity: [FAQS[0], ALTERNATIVES_FAQ, ...FAQS.slice(1)].map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
                  { "@type": "ListItem", position: 2, name: "Is Groupon still in NZ?", item: `${SITE_URL}${PATH}` },
                ],
              },
            ],
          }),
        }}
      />

      <PageHero crumb="Groupon NZ" title="Is Groupon still in New Zealand?">
        No. It closed its New Zealand business in 2020. Here&apos;s what happened, and the alternatives for local deals now.
      </PageHero>

      {/* The answer first, for people and for AI tools that quote it. */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-lg leading-relaxed text-slate-700">
            <strong>No.</strong> Groupon closed its New Zealand business in August 2020 and no longer sells deals here
            (<a href={SOURCES[0].url} className="font-semibold text-brand-600 hover:underline" rel="noopener">RNZ</a>).
            Vouchers bought before then could be used until 30 September 2020; after that, unused ones could be refunded
            through Groupon.
          </p>
          <p className="mt-3 text-sm text-slate-500">Last checked {CHECKED_LABEL}.</p>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${displayFont.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>What happened</h2>
          <ol className="mt-6 space-y-4">
            {TIMELINE.map((t) => (
              <li key={t.when} className="flex gap-4">
                <span className="w-32 shrink-0 text-sm font-bold text-brand-700">{t.when}</span>
                <span className="text-sm leading-relaxed text-slate-600">{t.what}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${displayFont.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>Alternatives to Groupon in New Zealand</h2>
          <p className="mt-3 text-slate-600">Since Groupon left in 2020, Kiwis find local deals on sites such as these:</p>
          <ul className="mt-6 space-y-4">
            {ALTERNATIVES.map((a) => (
              <li key={a.name} className={`rounded-2xl border p-5 ${a.url ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"}`}>
                <h3 className="text-base font-bold text-slate-900">
                  {a.url ? (
                    <a href={a.url} className="text-brand-600 hover:underline" rel="nofollow noopener">
                      {a.name}
                    </a>
                  ) : (
                    <>{a.name} (this site)</>
                  )}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{a.what}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">Each site sets its own offers and terms; check theirs before you book.</p>
          <p className="mt-3 text-sm text-slate-600">
            <Link href="/grabone-alternatives" className="font-semibold text-brand-600 hover:underline">
              Compare these sites in more detail
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${displayFont.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>Prepaid voucher or free deal code?</h2>
          <p className="mt-3 text-slate-600">
            Deals sites in New Zealand work in two main ways. On a voucher site, such as GrabOne, you buy a voucher online
            first, then use it at the business. On {SITE_NAME}, the deal code is free: you contact the business and pay
            them directly at the deal price.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-bold text-slate-900">Prepaid voucher</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>You pay the deals site up front</li>
                <li>You use the voucher at the business later</li>
                <li>Your money is with the deals site until then</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <h3 className="text-base font-bold text-slate-900">Free deal code ({SITE_NAME})</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>Nothing to pay up front</li>
                <li>You quote the code when you book or visit</li>
                <li>You pay the business directly at the deal price</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-slate-600">
            {SITE_NAME} is New Zealand-owned and starts in Auckland, with deals from local restaurants, cafés, spas,
            activities, getaways and more.{" "}
            <Link href="/how-it-works" className="font-semibold text-brand-600 hover:underline">
              See how it works
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
            Groupon, GrabOne, First Table and Bookme are trademarks of their owners. {SITE_NAME} isn&apos;t connected with
            them and uses the names only to answer this question.
          </p>
        </div>
      </section>
    </main>
  );
}
