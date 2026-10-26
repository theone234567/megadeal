import { safeJsonLd } from "@/lib/safeJsonLd";

export type HomeFaq = { q: string; a: string };

/** Shopper answers shared by the home page before and after launch. Plain
 *  text; every one restates what the site says elsewhere (/help,
 *  /how-it-works, /groupon-nz): no new promises. */
export const SHOPPER_FAQS = {
  howItWorks: {
    q: "How does MegaDeal work?",
    a: "Browse deals from local Auckland businesses, open one and copy its deal code. Then contact the business to book or visit, quote the code and pay them at the deal price. There's no voucher to buy and MegaDeal never charges customers.",
  },
  free: {
    q: "Is MegaDeal free to use?",
    a: "Yes. Browsing and using deals is free and needs no account. You pay the business directly, at the price shown on the deal.",
  },
  groupon: {
    q: "Is MegaDeal like Groupon?",
    a: "Not quite. Groupon closed its New Zealand business in 2020, and MegaDeal isn't connected with it. MegaDeal is a New Zealand-owned local deals site, and there's no voucher to buy: you get a free deal code, contact the business and pay them directly at the deal price.",
  },
  grabone: {
    q: "How is MegaDeal different from GrabOne?",
    a: "With GrabOne, you buy a voucher online first, then use it at the business. MegaDeal works differently. The deal code is free, you contact the business, and you pay them directly at the deal price. You never pay up front, so there's no voucher money to lose if a website or business closes. MegaDeal isn't connected with GrabOne.",
  },
} satisfies Record<string, HomeFaq>;

const STEPS = [
  { title: "Find a deal", text: "Browse local deals from Auckland businesses. No account needed." },
  { title: "Get the code", text: "Open the deal and copy its code. It's free: there's no voucher to buy." },
  { title: "Contact the business", text: "Book or visit, quote the code and pay the business at the deal price." },
];

/** "How MegaDeal works" and the questions people ask, on the home page
 *  before and after launch. The answers are also given to search engines
 *  and AI tools as FAQPage data. */
export default function HomeHowItWorks({ faqs }: { faqs: HomeFaq[] }) {
  return (
    <section aria-labelledby="how-heading" className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }),
        }}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div>
          <h2 id="how-heading" className="font-display text-[1.5rem] font-bold leading-tight text-hp-ink lg:text-[1.75rem]">
            How MegaDeal works
          </h2>
          <p className="mt-1 text-sm text-hp-muted sm:text-[0.9375rem]">No vouchers, no fees for customers.</p>
          <ol className="mt-5 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hp-lavender font-display text-sm font-bold text-hp-purple"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-hp-ink">{s.title}</h3>
                  <p className="text-sm text-hp-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-hp-ink">Questions</h2>
          <div className="mt-3 divide-y divide-hp-line rounded-2xl border border-hp-line bg-white">
            {faqs.map((f) => (
              <details key={f.q} name="home-faq" className="group px-4 sm:px-5">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[0.9375rem] font-semibold text-hp-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="shrink-0 text-lg leading-none text-hp-muted transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-hp-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

