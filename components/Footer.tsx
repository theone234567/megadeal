"use client";

import Link from "next/link";

// Footer links aren't fetched ahead (prefetch={false}): scrolling past
// them on a phone otherwise downloaded a dozen pages and their pictures
// nobody had asked for. Each page still loads as normal when tapped.
import { ADVERTISE_PAGES } from "@/lib/businessLinks";
import { usePathname } from "next/navigation";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import { DEFAULT_CITY, cityPath } from "@/lib/cities";
import SocialLinks from "./SocialLinks";
import { currentPromo } from "@/lib/promo";
import EmailSignupForm from "./EmailSignupForm";
import { LEGAL_ENTITY_NAME, LEGAL_ENTITY_NZBN } from "@/lib/siteConfig";

/**
 * Before launch, the /auckland/* category pages render the full launched-site chrome
 * over an empty "No deals yet" grid, so linking there from the footer
 * dead-ends every visitor on the pre-launch site. Until we're live, point
 * the whole column at the coming-soon page's category preview instead.
 */

function footerCategories(siteLaunched: boolean, prelaunchHome: boolean) {
  // Category pages are public once deals are (DEALS_OPEN), launched or not.
  // The city page first: it's the page for "deals in Auckland", and every
  // page linking to it is what tells search engines it matters.
  return [
    ...(siteLaunched ? [{ name: `All ${DEFAULT_CITY.name} deals`, href: cityPath() }] : []),
    ...CATEGORIES.map((category) => ({
      name: category.name,
      href: siteLaunched
        ? categoryPath(category.name)
        : prelaunchHome
          ? // The category pages are private until launch: the
            // homepage's own filter instead.
            `/?category=${category.slug}`
          : "/coming-soon#categories",
    })),
  ];
}

/**
 * `siteLaunched` is passed in from the server layout rather than imported
 * from siteConfig: SITE_LAUNCHED reads a server-only env var (no
 * NEXT_PUBLIC_ prefix), so importing it into this client component would
 * evaluate to `false` in the browser bundle no matter what the real
 * setting is — and disagree with the server render.
 */
export default function Footer({
  siteLaunched = false,
  prelaunchHome = false,
  dealsOpen = siteLaunched,
}: {
  siteLaunched?: boolean;
  prelaunchHome?: boolean;
  /** Deal and category pages are public (lib/siteConfig.ts DEALS_OPEN). */
  dealsOpen?: boolean;
}) {
  const FOOTER_CATEGORIES = footerCategories(dealsOpen, prelaunchHome);
  // The business offer of the moment: 6 months / WELCOME6 before launch,
  // the launch offer after (lib/promo.ts).
  const promo = currentPromo(siteLaunched);
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";
  // The prelaunch homepage ends with its business card, which has its own
  // space below it: no extra gap above the footer.
  const prelaunchHomePage = prelaunchHome && pathname === "/";
  // The homepage has its own business invitation between the deal
  // sections, so this banner would repeat it a scroll later.
  const hideOwnABusinessCta =
    pathname === "/" ||
    pathname === "/dev-home-preview" ||
    pathname?.startsWith("/list-your-business") ||
    pathname?.startsWith("/advertise/") ||
    isComingSoon;

  // The portal has its own dedicated layout (PortalShell) — the large
  // marketing footer (category links, "own a business" banner, social
  // links) has nothing to do with a merchant managing their account and
  // just adds scroll length under every portal page.
  if (pathname?.startsWith("/portal")) return null;

  return (
    <footer className={`${prelaunchHomePage ? "" : "mt-16 "}border-t border-slate-100 bg-slate-50`}>
      {!hideOwnABusinessCta && (
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-brand-deep flex flex-col items-center justify-between gap-4 rounded-2xl px-6 py-7 text-center sm:flex-row sm:px-8 sm:text-left">
            <div>
              <h2 className="font-display text-xl font-bold text-white">Own a local business?</h2>
              <p className="text-sm text-brand-100">
                List your deal on MegaDeal and get up to {promo.months} months free advertising — use code <span className="font-bold">{promo.code}</span> at signup.{" "}
                <Link prefetch={false} href="/terms" className="text-brand-200 underline hover:text-white">
                  Conditions apply.
                </Link>
              </p>
            </div>
            <Link
              prefetch={false}
              href="/list-your-business"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
            >
              Sign up &amp; list a deal
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1200px] px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        {/* Email sign-up for shoppers: a full-width strip, so the email
            box has room (#deal-alerts). The social links are in the dark
            band below. The wording
            follows launch: before it there are no deal emails yet, only
            the launch announcement. */}
        <section
          id="deal-alerts"
          aria-labelledby="footer-signup-heading"
          className="flex scroll-mt-24 flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
        >
          <div className="lg:max-w-md">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-600">
              {siteLaunched ? "Deals by email" : "Shopping for deals?"}
            </p>
            <h2 id="footer-signup-heading" className="mt-1 font-display text-[1.5rem] font-bold leading-tight text-slate-900 [text-wrap:balance] lg:text-[1.75rem]">
              {siteLaunched ? "Never miss a local deal" : "Get Auckland\u2019s launch deals by email"}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              {siteLaunched
                ? "The best new Auckland deals, straight to your inbox."
                : "We'll email you when MegaDeal launches, then send the best new local deals."}
            </p>
          </div>
          <div className="w-full lg:max-w-[520px]">
            <EmailSignupForm
              audience="customer"
              source="footer"
              buttonLabel={siteLaunched ? "Sign me up" : "Notify me"}
              surface="plain"
              rememberSignup
            />
          </div>
        </section>
      </div>

      {/* The link area, with the brand and the company's details along the
          bottom: how an established site signs off (owner, 27 Oct 2026). Link lists, not page sections: their titles
          are labels rather than headings, so every page's outline is its
          own content and not "Categories, Company, Support" (SEO pack T11).
          Each list is a named navigation landmark for screen readers. */}
      <div className="border-t border-hp-line bg-white">
        <div className="mx-auto max-w-[1200px] px-4 pb-8 pt-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,3fr)]">
            <div>
              <Link prefetch={false} href="/" className="inline-block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
                {/* Lazy: it's always below the fold, and without it the page
                    asked for this logo up front, beside the header's. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/minimal/megadeal-logo-minimal-purple.svg" alt="MegaDeal" width={150} height={32} loading="lazy" decoding="async" className="h-8 w-auto" />
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">
                Local deals from real New Zealand businesses. Free deal codes, and you pay the business directly.
              </p>
              <SocialLinks className="mt-5" />
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              <FooterList id="footer-categories" title="Categories" links={FOOTER_CATEGORIES.map((c) => ({ name: c.name, href: c.href }))} />
              {/* The advertise pages, linked from every page (lib/businessLinks.ts). */}
              <FooterList id="footer-advertise" title="Advertise with us" links={ADVERTISE_PAGES.map((l) => ({ name: `${l.name} advertising`, href: l.href }))} />
              <FooterList
                id="footer-company"
                title="Company"
                links={[
                  { name: "List your business", href: "/list-your-business" },
                  { name: "About MegaDeal", href: "/about" },
                  { name: "How it works", href: "/how-it-works" },
                  { name: "Careers", href: "/careers" },
                  ...(!siteLaunched && !prelaunchHome ? [{ name: "Coming soon", href: "/coming-soon" }] : []),
                ]}
              />
              {/* No visible link to /developers: the deals feed is for AI tools
                  and search engines, which find it through llms.txt, the
                  sitemap and the <link rel="alternate"> in every page's head. */}
              <FooterList
                id="footer-support"
                title="Support"
                links={[
                  { name: "Help centre", href: "/help" },
                  { name: "How to redeem a deal", href: "/redeem" },
                  { name: "Refund policy", href: "/refund-policy" },
                  { name: "Privacy policy", href: "/privacy" },
                  { name: "Terms of service", href: "/terms" },
                  { name: "Contact us", href: "/contact" },
                ]}
              />
            </div>
          </div>

          {/* Terms and Privacy live in the Support column above, where people
              look for them; the bottom line is the company itself. */}
          <div className="mt-12 flex flex-col gap-2 border-t border-hp-line pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {LEGAL_ENTITY_NAME}. All rights reserved.
            </p>
            <p>New Zealand owned{LEGAL_ENTITY_NZBN ? ` · NZBN ${LEGAL_ENTITY_NZBN}` : ""}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** One column of footer links, a named navigation landmark. */
function FooterList({ id, title, links }: { id: string; title: string; links: { name: string; href: string }[] }) {
  return (
    <nav aria-labelledby={id}>
      <p id={id} className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-900">
        {title}
      </p>
      <ul className="space-y-1 text-sm text-slate-600">
        {links.map((l) => (
          <li key={l.href + l.name}>
            <Link prefetch={false} href={l.href} className="inline-block rounded py-1 transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
