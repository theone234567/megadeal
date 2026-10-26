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
import { LEGAL_ENTITY_NAME } from "@/lib/siteConfig";

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
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-brand-700 px-6 py-6 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="text-lg font-bold text-white">Own a local business?</h2>
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
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700"
            >
              Sign up &amp; list a deal
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        {/* Email sign-up for shoppers, with the social links: a full-width
            strip, so the email box has room (#deal-alerts). The wording
            follows launch: before it there are no deal emails yet, only
            the launch announcement. */}
        <section
          id="deal-alerts"
          aria-labelledby="footer-signup-heading"
          className="mb-10 flex scroll-mt-24 flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
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
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Follow us</span>
              <SocialLinks />
            </div>
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

        {/* Link lists, not page sections: their titles are labels rather
            than headings, so every page's outline is its own content and
            not "Categories, Company, Support" (SEO pack T11). Each list is
            a named navigation landmark for screen readers instead. */}
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          <nav aria-labelledby="footer-categories">
            <p id="footer-categories" className="mb-3 text-sm font-bold text-slate-900">Categories</p>
            <ul className="space-y-1 text-sm text-slate-600">
              {FOOTER_CATEGORIES.map((category) => (
                <li key={category.name}>
                  <Link prefetch={false} href={category.href} className="inline-block py-1 hover:text-brand-700">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* The advertise pages, linked from every page (lib/businessLinks.ts). */}
          <nav aria-labelledby="footer-advertise">
            <p id="footer-advertise" className="mb-3 text-sm font-bold text-slate-900">Advertise with us</p>
            <ul className="space-y-1 text-sm text-slate-600">
              {ADVERTISE_PAGES.map((l) => (
                <li key={l.href}>
                  <Link prefetch={false} href={l.href} className="inline-block py-1 hover:text-brand-700">
                    {l.name} advertising
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-company">
            <p id="footer-company" className="mb-3 text-sm font-bold text-slate-900">Company</p>
            <ul className="space-y-1 text-sm text-slate-600">
              <li><Link prefetch={false} href="/list-your-business" className="inline-block py-1 hover:text-brand-700">List your business</Link></li>
              <li><Link prefetch={false} href="/about" className="inline-block py-1 hover:text-brand-700">About MegaDeal</Link></li>
              <li><Link prefetch={false} href="/how-it-works" className="inline-block py-1 hover:text-brand-700">How it works</Link></li>
              <li><Link prefetch={false} href="/careers" className="inline-block py-1 hover:text-brand-700">Careers</Link></li>
              {!siteLaunched && !prelaunchHome && (
                <li><Link prefetch={false} href="/coming-soon" className="inline-block py-1 hover:text-brand-700">Coming soon</Link></li>
              )}
            </ul>
          </nav>
          <nav aria-labelledby="footer-support">
            <p id="footer-support" className="mb-3 text-sm font-bold text-slate-900">Support</p>
            <ul className="space-y-1 text-sm text-slate-600">
              <li><Link prefetch={false} href="/help" className="inline-block py-1 hover:text-brand-700">Help centre</Link></li>
              <li><Link prefetch={false} href="/redeem" className="inline-block py-1 hover:text-brand-700">How to redeem a deal</Link></li>
              <li><Link prefetch={false} href="/refund-policy" className="inline-block py-1 hover:text-brand-700">Refund policy</Link></li>
              <li><Link prefetch={false} href="/privacy" className="inline-block py-1 hover:text-brand-700">Privacy policy</Link></li>
              <li><Link prefetch={false} href="/terms" className="inline-block py-1 hover:text-brand-700">Terms of service</Link></li>
              <li><Link prefetch={false} href="/contact" className="inline-block py-1 hover:text-brand-700">Contact us</Link></li>
              {/* No visible link to /developers: the deals feed is for AI tools and
                  search engines, which find it through llms.txt, the sitemap and
                  the <link rel="alternate"> in every page's head. */}
            </ul>
          </nav>
        </div>

        {/* Terms and Privacy live in the Support column above, where people
            look for them; one link each keeps the footer from repeating. */}
        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-center text-sm text-slate-500 sm:text-left">© {new Date().getFullYear()} {LEGAL_ENTITY_NAME}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}