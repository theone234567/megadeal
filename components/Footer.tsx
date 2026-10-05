"use client";

import Link from "next/link";
import { ADVERTISE_PAGES } from "@/lib/businessLinks";
import { usePathname } from "next/navigation";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import SocialLinks from "./SocialLinks";
import EmailSignupForm from "./EmailSignupForm";

/**
 * Before launch, /category/* pages render the full launched-site chrome
 * over an empty "No deals yet" grid, so linking there from the footer
 * dead-ends every visitor on the pre-launch site. Until we're live, point
 * the whole column at the coming-soon page's category preview instead.
 */
const FOOTER_BUSINESS_LINKS = [{ href: "/list-your-business", label: "List your business" }, ...ADVERTISE_PAGES];

function footerCategories(siteLaunched: boolean) {
  return CATEGORIES.map((category) => ({
    name: category.name,
    href: siteLaunched
      ? categoryPath(category.name)
      : "/coming-soon#categories",
  }));
}

/**
 * `siteLaunched` is passed in from the server layout rather than imported
 * from siteConfig: SITE_LAUNCHED reads a server-only env var (no
 * NEXT_PUBLIC_ prefix), so importing it into this client component would
 * evaluate to `false` in the browser bundle no matter what the real
 * setting is — and disagree with the server render.
 */
export default function Footer({ siteLaunched = false }: { siteLaunched?: boolean }) {
  const FOOTER_CATEGORIES = footerCategories(siteLaunched);
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";
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
    <footer className="mt-16 border-t border-slate-100 bg-slate-50">
      {!hideOwnABusinessCta && (
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-brand-700 px-6 py-6 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="text-lg font-bold text-white">Own a local business?</h2>
              <p className="text-sm text-brand-100">
                List your deal on MegaDeal and get up to 6 months free advertising — use code <span className="font-bold">WELCOME6</span> at signup.{" "}
                <Link href="/terms" className="text-brand-200 underline hover:text-white">
                  Conditions apply.
                </Link>
              </p>
            </div>
            <Link
              href="/list-your-business"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700"
            >
              Sign up &amp; list a deal
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        {/* Email sign-up: a full-width strip, so the email box has room
            (in a fifth-width column it was ~150px, half the screen on a
            phone). The wording follows launch: before it there are no
            deal emails yet, only the launch announcement. */}
        <section
          aria-labelledby="footer-signup-heading"
          className="mb-10 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
        >
          <div className="lg:max-w-md">
            <h2 id="footer-signup-heading" className="font-display text-xl font-semibold text-slate-900 [text-wrap:balance]">
              {siteLaunched ? "Never miss a local deal" : "Be first to hear about Auckland deals"}
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
            />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Categories</h2>
            <ul className="space-y-1 text-sm text-slate-600">
              {FOOTER_CATEGORIES.map((category) => (
                <li key={category.name}>
                  <Link href={category.href} className="inline-block py-1 hover:text-brand-700">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* The advertise pages, linked from every page (lib/businessLinks.ts). */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900">For businesses</h2>
            <ul className="space-y-1 text-sm text-slate-600">
              {FOOTER_BUSINESS_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-block py-1 hover:text-brand-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Company</h2>
            <ul className="space-y-1 text-sm text-slate-600">
              <li><Link href="/about" className="inline-block py-1 hover:text-brand-700">About MegaDeal</Link></li>
              <li><Link href="/how-it-works" className="inline-block py-1 hover:text-brand-700">How it works</Link></li>
              <li><Link href="/careers" className="inline-block py-1 hover:text-brand-700">Careers</Link></li>
              {!siteLaunched && (
                <li><Link href="/coming-soon" className="inline-block py-1 hover:text-brand-700">Coming soon</Link></li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Support</h2>
            <ul className="space-y-1 text-sm text-slate-600">
              <li><Link href="/help" className="inline-block py-1 hover:text-brand-700">Help centre</Link></li>
              <li><Link href="/redeem" className="inline-block py-1 hover:text-brand-700">How to redeem a deal</Link></li>
              <li><Link href="/refund-policy" className="inline-block py-1 hover:text-brand-700">Refund policy</Link></li>
              <li><Link href="/contact" className="inline-block py-1 hover:text-brand-700">Contact us</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Follow MegaDeal</h2>
            <SocialLinks />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-center text-sm text-slate-500 sm:text-left">© {new Date().getFullYear()} MegaDeal. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link href="/terms" className="inline-block py-1 hover:text-brand-700">Terms</Link>
            <Link href="/privacy" className="inline-block py-1 hover:text-brand-700">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}