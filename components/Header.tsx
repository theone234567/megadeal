"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreIcon } from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";
import { PURPLE_HEADER } from "@/lib/brand";
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
  "/advertise/home-car": { ctaLabel: "List my business" },
  "/advertise/things-to-do": { ctaLabel: "List my business" },
};

// Colours for the three headers below: brand purple with the white logo
// while the minimal logo is on, white as before with the classic one (both
// set by LOGO_STYLE in lib/brand.ts). The classic values are the classes
// these headers had before, unchanged.
const T = PURPLE_HEADER
  ? {
      logo: "onDark" as const,
      storefrontBar: "border-hp-purple-dark bg-hp-purple",
      landingBar: "border-hp-purple-dark bg-hp-purple",
      comingSoonBar: "border-hp-purple-dark bg-hp-purple",
      ring: "focus-visible:ring-white",
      divider: "bg-white/30",
      muted: "text-white/80",
      nav: "text-white",
      navLink: "hover:text-white/80",
      signIn: "text-white hover:bg-white/10 focus-visible:ring-white",
      // White buttons on purple, purple text: the main action still stands out.
      listBusiness: "border-white focus-visible:ring-white focus-visible:ring-offset-hp-purple",
      landingCta: "bg-white text-brand-600 hover:bg-hp-lavender",
      comingSoonSignIn: "border-white",
    }
  : {
      logo: "onLight" as const,
      storefrontBar: "border-hp-line bg-white",
      landingBar: "border-slate-100 bg-white",
      comingSoonBar: "border-[#eeeaf5] bg-white",
      ring: "focus-visible:ring-hp-purple",
      divider: "bg-slate-200",
      muted: "text-slate-500",
      nav: "text-slate-900",
      navLink: "hover:text-brand-700",
      signIn: "text-hp-ink hover:bg-hp-lavender hover:text-hp-purple focus-visible:ring-hp-purple",
      listBusiness: "",
      landingCta: "bg-brand-600 text-white hover:bg-brand-700",
      comingSoonSignIn: "border-brand-600",
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
      <header className={`sticky top-0 z-30 border-b ${T.landingBar}`}>
        <div className="mx-auto flex h-[74px] w-full max-w-[1184px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={pathname!} aria-label="MegaDeal home" className="flex min-w-0 shrink items-center gap-3">
            <BrandLogo placement="landing" tone={T.logo} />
            <span className={`hidden h-5 w-px shrink-0 sm:block ${T.divider}`} aria-hidden />
            <span className={`hidden shrink-0 text-sm sm:inline-block ${T.muted}`}>
              for business
            </span>
          </Link>

          <nav className={`hidden items-center gap-7 text-sm font-semibold lg:flex ${T.nav}`}>
            <a href="#why-megadeal" className={`transition ${T.navLink}`}>
              Why MegaDeal
            </a>
            <a href="#how-it-works" className={`transition ${T.navLink}`}>
              How it works
            </a>
            <a href="#questions" className={`transition ${T.navLink}`}>
              FAQs
            </a>
          </nav>

          <a
            href="#launch-offer"
            data-cta-section="header"
            className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-extrabold transition sm:px-5 sm:text-sm ${T.landingCta}`}
          >
            {businessLanding.ctaLabel}
          </a>
        </div>
      </header>
    );
  }

  if (isComingSoon) {
    return (
      <header className={`sticky top-0 z-50 border-b ${T.comingSoonBar}`}>
        <div className="mx-auto flex min-h-[51px] w-full max-w-[1500px] items-center justify-between gap-3 px-4 py-2 sm:min-h-[58px] sm:gap-5 sm:px-8 lg:min-h-[61px] lg:px-10 xl:px-12">
          <Link href="/coming-soon" aria-label="MegaDeal home" className="min-w-0 shrink">
            <BrandLogo placement="landing" tone={T.logo} />
          </Link>

          {/* Business sign-in only: deal hunters have no account. On phones
              this used to read just "Sign in", which looked like a
              customer sign-in. */}
          <Link
            href="/portal"
            className={`shrink-0 whitespace-nowrap rounded-full border-[1.5px] bg-white px-3 py-2 text-xs font-extrabold text-brand-600 transition hover:bg-hp-lavender sm:px-5 sm:text-sm lg:px-6 lg:py-2.5 ${T.comingSoonSignIn}`}
          >
            Business sign in<span className="hidden sm:inline"> →</span>
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
    <header className={`sticky top-0 z-30 border-b ${T.storefrontBar}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:gap-5 lg:px-8 lg:py-3">
        <div className="flex items-center justify-between gap-2 lg:contents">
          <Link
            href="/"
            aria-label="MegaDeal home"
            // lg:shrink-0: on desktop the link sits in the same row as the
            // search box, which grows; allowed to shrink, the link was
            // squeezed narrower than the logo inside it, so the logo spilled
            // out towards the search box.
            className={`min-w-0 shrink rounded-lg focus-visible:outline-none focus-visible:ring-2 lg:shrink-0 ${T.ring}`}
          >
            <BrandLogo placement="site" tone={T.logo} />
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
            className={`inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${T.signIn}`}
          >
            Business sign in
          </Link>
          <Link href="/list-your-business" className={`btn-secondary h-10 min-h-0 px-4 text-sm ${T.listBusiness}`}>
            <StoreIcon className="h-[18px] w-[18px]" />
            List your business
          </Link>
        </div>
      </div>
    </header>
  );
}
