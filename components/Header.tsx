"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { StoreIcon } from "@/components/icons";
import HeaderSearch from "@/components/header/HeaderSearch";
import LocationSelect from "@/components/header/LocationSelect";
import MobileMenu from "@/components/header/MobileMenu";

// Real intrinsic size of public/branding/megadeal-logo.webp — a separate
// file from the megadeal-logo.webp the asset-manifest system's art.logo
// resolves to (used by PortalShell, emails, and the OG-image generators),
// so swapping the header's logo here can't silently change any of those.
const HEADER_LOGO_SRC = "/branding/megadeal-logo.webp";
const HEADER_LOGO_WIDTH = 600;
const HEADER_LOGO_HEIGHT = 200;

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

  // One size everywhere — this used to differ between the coming-soon
  // header and every other page's, which read as inconsistent branding
  // just like the old SVG-vs-raster split did.
  //
  // 36/44/48px: standard professional header-logo height (most sites
  // land in a 32-48px range regardless of brand). The mark had been
  // pushed up to 72-126px across several "bigger" requests in a row —
  // legible, but blown up that far a character-based logo reads as a
  // kids'-app icon rather than a business wordmark, no matter how the
  // character itself is drawn.
  const LOGO_HEIGHT = "h-9 sm:h-11 lg:h-12";

  // The supplied lockup (elephant + the "MegaDeal" wordmark) is the header's
  // logo. width/height are the file's real intrinsic size — needed for
  // Next/Image's aspect-ratio math — but LOGO_HEIGHT is what actually
  // controls the rendered box; w-auto lets width follow from that so the
  // mark can't stretch.
  const brand = () => (
    <Image
      src={HEADER_LOGO_SRC}
      alt="MegaDeal"
      width={HEADER_LOGO_WIDTH}
      height={HEADER_LOGO_HEIGHT}
      priority
      className={`w-auto select-none object-contain ${LOGO_HEIGHT}`}
    />
  );

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
            {brand()}
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
            className="shrink-0 rounded-full bg-[#C81287] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#DC168F] sm:px-5 sm:text-sm"
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
            {brand()}
          </Link>

          <Link
            href="/portal"
            className="shrink-0 rounded-full border border-[#b99aee] bg-white px-4 py-2.5 text-xs font-extrabold text-brand-700 transition hover:border-[#6d24dc] hover:bg-[#faf8ff] sm:px-5 sm:text-sm lg:px-6 lg:py-3"
          >
            <span className="sm:hidden">Sign in →</span>
            <span className="hidden sm:inline">Business sign in →</span>
          </Link>
        </div>
      </header>
    );
  }

  // The deal-hunter header: brand, search, location and the business
  // entry. Deal hunters have no accounts, so there's no sign-in, saved
  // deals or profile here — "For businesses" is the merchant portal.
  //
  // Search and location read the URL, which needs a Suspense boundary on
  // statically rendered pages; the fallbacks are the same controls,
  // empty, so nothing shifts when they hydrate.
  const search = (
    <Suspense fallback={<HeaderSearch withParams={false} />}>
      <HeaderSearch withParams />
    </Suspense>
  );
  const location = (
    <Suspense fallback={<LocationSelect withParams={false} />}>
      <LocationSelect withParams />
    </Suspense>
  );

  return (
    <header className="z-30 border-b border-hp-line bg-white lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8 lg:py-3.5">
        <div className="flex items-center justify-between gap-2 lg:contents">
          <Link
            href="/"
            aria-label="MegaDeal home"
            className="min-w-0 shrink rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
          >
            <Image
              src={HEADER_LOGO_SRC}
              alt=""
              width={HEADER_LOGO_WIDTH}
              height={HEADER_LOGO_HEIGHT}
              priority
              className="h-12 w-auto select-none object-contain lg:h-14"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-1 lg:hidden">
            {location}
            <MobileMenu />
          </div>
        </div>

        <div className="w-full lg:max-w-[40rem] lg:flex-1">{search}</div>

        <div className="hidden shrink-0 items-center gap-3 lg:ml-auto lg:flex">
          {location}
          <Link
            href="/portal"
            className="flex h-11 items-center gap-2 rounded-full bg-hp-purple px-5 text-sm font-bold text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
          >
            <StoreIcon className="h-[18px] w-[18px]" />
            For businesses
          </Link>
        </div>
      </div>
    </header>
  );
}
