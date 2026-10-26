import type { Metadata } from "next";
import Link from "next/link";
import { ORGANIZATION_ID, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { pageMetadata } from "@/lib/pageMetadata";
import { CONTENT_UPDATED } from "@/lib/sitemapDates";

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
// A calendar date, so formatted as one (in NZ time it would move a day).
const CHECKED_LABEL = new Date(`${CHECKED}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const metadata: Metadata = pageMetadata({
  title: "Is Groupon Still in NZ? No, It Closed in 2020",
  description:
    "Groupon closed its New Zealand business in August 2020. What happened to its vouchers, and how Kiwis find local deals now, including free deal codes.",
  path: PATH,
});

const SOURCES = [
  { name: "RNZ: Groupon closing its New Zealand business (2020)", url: "https://www.rnz.co.nz/news/business/423237/groupon-closing-its-new-zealand-business" },
  { name: "Stuff: Groupon says it has closed its New Zealand business (2020)", url: "https://www.stuff.co.nz/business/industries/122407442/groupon-says-it-has-closed-its-new-zealand-business" },
  { name: "NZ Herald: Daily deals website Groupon closes New Zealand business (2020)", url: "https://www.nzherald.co.nz/business/daily-deals-website-groupon-closes-new-zealand-business/CY4CHGGKB43HA6WFZ56KPVAAPU/" },
];

const ANSWER =
  "No. Groupon closed its New Zealand business in August 2020 and no longer sells deals here. Vouchers bought before then could be used until 30 September 2020; after that, unused ones could be refunded through Groupon.";

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
                datePublished: "2026-10-26",
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
                  { "@type": "ListItem", position: 2, name: "Is Groupon still in NZ?", item: `${SITE_URL}${PATH}` },
                ],
              },
            ],
          }),
        }}
      />

      <section className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className={`${fredoka.className} text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl`}>
            Is Groupon still in New Zealand?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">No. It closed its New Zealand business in 2020.</p>
        </div>
      </section>

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
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>What happened</h2>
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
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>Finding local deals in New Zealand now</h2>
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

      <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>Questions</h2>
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

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${fredoka.className} text-xl font-bold text-slate-900`}>Sources</h2>
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
            Groupon is a trademark of its owner. {SITE_NAME} uses the name only to answer this question.
          </p>
        </div>
      </section>
    </main>
  );
}
