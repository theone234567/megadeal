import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { DEALS_OPEN, SITE_NAME, SITE_URL, ORGANIZATION_ID } from "@/lib/siteConfig";
import { displayFont, plusJakartaSans } from "@/lib/fonts";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { pageMetadata } from "@/lib/pageMetadata";
import { CATEGORIES } from "@/lib/categories";
import { DEAL_TAGS } from "@/lib/dealTags";
import { NZ_CITIES } from "@/lib/nzPlaces";
import { FEED_MAX_LIMIT, FEED_RATE_LIMIT, FEED_TERMS, FEED_VERSION, feedDeal } from "@/lib/dealFeed";
import type { Deal } from "@/lib/types";
import PageHero from "@/components/PageHero";

const DESCRIPTION =
  "Every live MegaDeal deal as free JSON for AI tools and developers: prices, dates, conditions, how to redeem and who verified each deal. New Zealand only.";

export const metadata: Metadata = pageMetadata({
  title: "Deals data for developers and AI",
  description: DESCRIPTION,
  path: "/developers",
});

const FEED = `${SITE_URL}/feed/deals.json`;

/** A made-up deal, run through the real feed code so the example can't
 *  drift from what the feed returns. */
const EXAMPLE: Deal = {
  id: "8d1c3a52-5b7e-4f0a-9d1e-2b3c4d5e6f70",
  slug: "two-course-dinner-for-two-example-bistro-ponsonby",
  name: "Two-course dinner for two",
  description: "<p>Any main and dessert each from the dinner menu.</p>",
  image: `${SITE_URL}/media/photos/2026-10/example.jpg`,
  now: 49,
  was: 80,
  formattedNow: null,
  formattedWas: null,
  discountPercent: 39,
  currency: "NZD",
  ribbon: null,
  categories: ["Food & Drink"],
  variantId: null,
  inStock: true,
  quantityAvailable: 20,
  expiresAt: "2026-11-05T10:30:00.000Z",
  startsAt: "2026-10-20T19:00:00.000Z",
  status: "Live",
  isFlash: false,
  terms: "Dine-in only. Not valid on public holidays.",
  businessName: "Example Bistro",
  businessLogoUrl: null,
  businessWebsite: "https://example.co.nz",
  businessPhone: "09 000 0000",
  businessAddress: "1 Example Street",
  businessAddressHidden: false,
  businessServiceArea: null,
  businessCity: "Auckland",
  businessSuburb: "Ponsonby",
  businessSlug: "example-bistro-ponsonby",
  businessBio: null,
  businessHours: null,
  businessFacebookUrl: null,
  businessInstagramUrl: null,
  businessPriceRange: null,
  businessAmenities: [],
  businessBookingUrl: null,
  businessBookingEmail: null,
  businessLat: -36.8566,
  businessLng: 174.7464,
  businessRating: null,
  businessReviewCount: null,
  dealCode: null,
  bookingRequirement: "recommended",
  codeOnWebsite: false,
  updatedAt: "2026-10-21T02:00:00.000Z",
  approvedAt: "2026-10-20T18:30:00.000Z",
  merchantConfirmedAt: "2026-10-28T01:00:00.000Z",
  source: "merchant",
  tags: ["date-night", "vegetarian-options"],
  businessClaimed: true,
};

const h2 = `${displayFont.className} text-2xl font-bold text-slate-900 sm:text-3xl`;

function Code({ children }: { children: ReactNode }) {
  return (
    // Focusable, so a keyboard can scroll a long line sideways.
    <pre
      tabIndex={0}
      className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <code>{children}</code>
    </pre>
  );
}

const FILTERS: { name: string; what: ReactNode; example: string }[] = [
  { name: "city", what: <>A city: {NZ_CITIES.map((c) => c.key).join(", ")}</>, example: "city=auckland" },
  { name: "category", what: <>A category: {CATEGORIES.map((c) => c.slug).join(", ")}</>, example: "category=food-drink" },
  { name: "tag", what: <>A tag from the list below</>, example: "tag=date-night" },
  { name: "type", what: <>flash (up to 6 hours) or everyday (up to 30 days)</>, example: "type=flash" },
  { name: "expires_before", what: <>Ending by then. A date means the end of that day in New Zealand; or a full ISO time</>, example: "expires_before=2026-11-30" },
  { name: "expires_after", what: <>Still running then. A date means the start of that day in New Zealand</>, example: "expires_after=2026-11-01" },
  { name: "limit", what: <>At most this many deals, 1 to {FEED_MAX_LIMIT} (default {FEED_MAX_LIMIT})</>, example: "limit=20" },
  { name: "offset", what: <>Skip this many, for paging</>, example: "offset=20" },
];

export default function DevelopersPage() {
  const example = JSON.stringify(feedDeal(EXAMPLE, SITE_URL), null, 2);
  return (
    <main className={plusJakartaSans.className}>
      {/* Dataset: lets Google Dataset Search and AI tools find the feed as
          data, with its licence terms and format. Only once there are
          deals in it. */}
      {DEALS_OPEN && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "Dataset",
              "@id": `${SITE_URL}/developers#dataset`,
              name: `${SITE_NAME} live deals in New Zealand`,
              description: DESCRIPTION,
              url: `${SITE_URL}/developers`,
              inLanguage: "en-NZ",
              isAccessibleForFree: true,
              usageInfo: `${SITE_URL}/developers#terms`,
              creator: { "@id": ORGANIZATION_ID },
              publisher: { "@id": ORGANIZATION_ID },
              spatialCoverage: { "@type": "Country", name: "New Zealand", identifier: "NZ" },
              keywords: ["deals", "discounts", "New Zealand", "local businesses", ...CATEGORIES.map((c) => c.name)],
              version: FEED_VERSION,
              distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: FEED }],
            }),
          }}
        />
      )}

      <PageHero crumb="Developers" title="Deals data for developers and AI">
        Every live {SITE_NAME} deal as JSON. Free, no key needed, New Zealand only.
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
        {!DEALS_OPEN && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {SITE_NAME} hasn&apos;t launched yet, so the feed is empty for now: it returns <code>&quot;launched&quot;: false</code> and no
            deals. Everything below is how it works from launch day.
          </p>
        )}

        <section>
          <h2 className={h2}>The feed</h2>
          <p className="mt-3 text-slate-600">
            One address returns every deal that&apos;s live right now, soonest-ending first, with its price, dates, conditions, how to
            redeem it, the business behind it, and who verified it and when. Deals leave the feed the moment they end.
          </p>
          <Code>GET {FEED}</Code>
          <p className="mt-3 text-sm text-slate-600">
            The full schema is at{" "}
            <a className="font-semibold text-brand-700 underline" href="/feed/openapi.json">
              /feed/openapi.json
            </a>{" "}
            (OpenAPI 3.1), so tools and AI agents can call it directly.
          </p>
        </section>

        <section>
          <h2 className={h2}>Filters</h2>
          <p className="mt-3 text-slate-600">Add any of these to the address. They combine, so every one has to match.</p>
          <div
            className="mt-4 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            tabIndex={0}
            role="region"
            aria-label="Filters"
          >
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-4">Filter</th>
                  <th scope="col" className="py-2 pr-4">What it means</th>
                  <th scope="col" className="py-2">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {FILTERS.map((f) => (
                  <tr key={f.name}>
                    <td className="py-2 pr-4 font-mono text-xs font-semibold">{f.name}</td>
                    <td className="py-2 pr-4">{f.what}</td>
                    <td className="py-2 font-mono text-xs">{f.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Code>GET {FEED}?city=auckland&amp;category=food-drink&amp;tag=date-night</Code>
          <p className="mt-3 text-sm text-slate-600">
            A filter the feed doesn&apos;t understand is refused with a 400 and a message listing what it accepts, rather than quietly
            returning every deal. Tracking tags added to shared links (<code>utm_*</code>, <code>fbclid</code>, <code>gclid</code>,{" "}
            <code>ref</code>) are ignored. Up to {FEED_RATE_LIMIT.max} requests a minute from one address; after that, a 429 with{" "}
            <code>Retry-After</code>.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Each response also says <code>&quot;prelaunch&quot;</code> (true during {SITE_NAME}&apos;s pre-launch period, when there may be
            only a few deals) and <code>&quot;redeemable&quot;</code> (true when the deals listed can be used now).
          </p>
          <h3 className="mt-6 font-semibold text-slate-900">Tags</h3>
          <p className="mt-1 text-sm text-slate-600">
            Businesses pick up to five from this fixed list, and {SITE_NAME} checks them before the deal goes live.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {DEAL_TAGS.map((t) => (
              <li key={t.id} className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
                {t.id}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={h2}>What each deal looks like</h2>
          <p className="mt-3 text-slate-600">An example (not a real deal):</p>
          <Code>{example}</Code>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Prices are in NZ dollars and paid to the business. {SITE_NAME} never takes payment.</li>
            <li>
              <code>original_amount</code> and <code>discount_percent</code> are <code>null</code> when the business didn&apos;t give a
              higher usual price; <code>quantity_available</code> is <code>null</code> when there&apos;s no limit. Nothing is estimated.
            </li>
            <li>All times are ISO 8601 in UTC. Deals run until <code>expires_at</code> exactly; they&apos;re never shown after it.</li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>Who verified a deal</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-slate-900">merchant-verified: &quot;Business verified&quot;</dt>
              <dd className="text-slate-600">The business runs its own {SITE_NAME} account, listed the deal itself, and {SITE_NAME} approved it.</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">megadeal-listed: &quot;Listed by MegaDeal&quot;</dt>
              <dd className="text-slate-600">{SITE_NAME} approved the deal, but the business hasn&apos;t claimed its account yet.</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">community-submitted</dt>
              <dd className="text-slate-600">Suggested by the public and checked by {SITE_NAME}. Not used yet.</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-slate-600">
            <code>approved_at</code> is when {SITE_NAME} last approved what the deal says; <code>merchant_confirmed_at</code> is when the
            business last confirmed it&apos;s still running as listed; <code>last_checked_at</code> is the later of the two;{" "}
            <code>updated_at</code> is when anything a customer sees last changed. The same facts are on each deal page and in its
            structured data.
          </p>
        </section>

        <section>
          <h2 className={h2}>What&apos;s not in the feed</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600">
            <li>
              <strong>Deal codes.</strong> Customers get the code on the deal page, so link people there.
            </li>
            <li>
              <strong>Email addresses.</strong>
            </li>
            <li>
              <strong>Private addresses.</strong> A home-based or mobile business can hide its street address and map pin; the feed
              then gives only its suburb, city and service area.
            </li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>Caching and freshness</h2>
          <p className="mt-3 text-slate-600">
            Responses can be cached for 60 seconds. Each carries an <code>ETag</code>: send it back in <code>If-None-Match</code> and
            you&apos;ll get <code>304 Not Modified</code> until something changes. Please don&apos;t ask more than once a minute.
          </p>
          <p className="mt-3 text-slate-600">
            Each deal page also carries schema.org structured data (WebPage, Product, Offer and LocalBusiness) with the same facts. A
            plain-text list of live deals is at{" "}
            <Link className="font-semibold text-brand-700 underline" href="/deals.txt" prefetch={false}>
              /deals.txt
            </Link>
            , and a summary for AI assistants at{" "}
            <Link className="font-semibold text-brand-700 underline" href="/llms.txt" prefetch={false}>
              /llms.txt
            </Link>
            .
          </p>
        </section>

        <section id="terms" className="scroll-mt-24">
          <h2 className={h2}>Using the data</h2>
          <p className="mt-3 text-slate-600">{FEED_TERMS}</p>
          <p className="mt-3 text-slate-600">
            The feed is versioned (now {FEED_VERSION}). New fields may be added at any time; anything renamed or removed gets a new
            major version, announced here first. Questions or problems:{" "}
            <Link className="font-semibold text-brand-700 underline" href="/contact">
              contact us
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
