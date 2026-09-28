"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreIcon } from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";
import HeaderSearch from "@/components/header/HeaderSearch";
import LocationSelect from "@/components/header/LocationSelect";
import MobileMenu from "@/components/header/MobileMenu";

// Business-recruitment landing pages each get the compact header below
// instead of the consumer search/city header — see the isRestaurantLanding
// comment further down for why. Keyed by pathname rather than a prefix
// check since each one has its own CTA label ("List my restaurant" reads
// wrong on a page about salons).
const BUSINESS_LANDING_PAGES: Record<string, { ctaLabel: string }> = {
  "/advertise/restaurants": { ctaLabel: "List my restaurant" },
  "/advertise/beauty-spa": { ctaLabel: "List my business" },
};

export default function Header() {
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";
  const businessLanding = pathname ? BUSINESS_LANDING_PAGES[pathname] : undefined;
  // The portal has its own dedicated top bar (components/portal/PortalShell.tsx)
  // with its own account/sign-out access — the consumer search bar and city
  // selector this header carries have nothing to do with a merchant managing
  // their own business, and competed with the portal's own account controls.
  const isPortal = pathname?.startsWith("/portal");

  // Compact, purpose-built header shared by every business-recruitment
  // landing page (BUSINESS_LANDING_PAGES above) — the standard header's
  // search bar and city selector have nothing to do with a page whose only
  // job is getting a business owner into signup, and would compete with
  // that page's own CTA. Sticky (unlike the coming-soon header) so the CTA
  // stays reachable on a page long enough to need it.
  if (isPortal) return null;

  if (businessLanding) {
    return (
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-[87px] w-full max-w-[1184px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={pathname!} aria-label="MegaDeal home" className="flex min-w-0 shrink items-center gap-3">
            <BrandLogo placement="landing" />
            <span className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
            <span className="hidden shrink-0 text-sm text-slate-500 sm:inline-block">
              for business
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-900 lg:flex">
            <a href="#why-megadeal" className="transition hover:text-brand-700">
              Why MegaDeal
            </a>
            <a href="#how-it-works" className="transition hover:text-brand-700">
              How it works
            </a>
            <a href="#questions" className="transition hover:text-brand-700">
              FAQs
            </a>
          </nav>

          <a
            href="#launch-offer"
            data-cta-section="header"
            className="shrink-0 rounded-full bg-brand-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-brand-700 sm:px-5 sm:text-sm"
          >
            {businessLanding.ctaLabel}
          </a>
        </div>
      </header>
    );
  }

  if (isComingSoon) {
    return (
      <header className="relative z-50 border-b border-[#eeeaf5] bg-white">
        <div className="mx-auto flex min-h-[60px] w-full max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:min-h-[68px] sm:gap-5 sm:px-8 lg:min-h-[72px] lg:px-10 xl:px-12">
          <Link href="/coming-soon" aria-label="MegaDeal home" className="min-w-0 shrink">
            <BrandLogo placement="landing" />
          </Link>

          <Link
            href="/portal"
            className="shrink-0 rounded-full border-[1.5px] border-brand-600 bg-white px-4 py-2.5 text-xs font-extrabold text-brand-600 transition hover:bg-hp-lavender sm:px-5 sm:text-sm lg:px-6 lg:py-3"
          >
            <span className="sm:hidden">Sign in →</span>
            <span className="hidden sm:inline">Business sign in →</span>
          </Link>
        </div>
      </header>
    );
  }

  // The deal-hunter header: brand, search, location and the two business
  // routes. Deal hunters have no accounts, so there's no customer sign-in,
  // saved deals or profile here.
  //
  const search = <HeaderSearch />;
  const location = <LocationSelect />;

  return (
    <header className="z-30 border-b border-hp-line bg-white lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-5 lg:px-8 lg:py-3.5">
        <div className="flex items-center justify-between gap-2 lg:contents">
          <Link
            href="/"
            aria-label="MegaDeal home"
            className="min-w-0 shrink rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
          >
            <BrandLogo placement="site" />
          </Link>
          <div className="flex shrink-0 items-center gap-1 lg:hidden">
            {location}
            <MobileMenu />
          </div>
        </div>

        <div className="w-full lg:max-w-[40rem] lg:flex-1">{search}</div>

        {/* Two business routes, named for who they're for: an existing
            business signs in to the portal; a new one starts at the
            signup page. Deal hunters have no account to sign in to. */}
        <div className="hidden shrink-0 items-center gap-2 lg:ml-auto lg:flex">
          {location}
          <Link
            href="/portal"
            className="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-hp-ink transition hover:bg-hp-lavender hover:text-hp-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
          >
            Business sign in
          </Link>
          <Link href="/list-your-business" className="btn-secondary h-11 min-h-0 px-4 text-sm">
            <StoreIcon className="h-[18px] w-[18px]" />
            List your business
          </Link>
        </div>
      </div>
    </header>
  );
}
