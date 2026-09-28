"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import { HomeIcon, ReceiptIcon, StoreIcon, CreditCardIcon } from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";
import { PURPLE_HEADER } from "@/lib/brand";
import IdlePortalSignOut from "./IdlePortalSignOut";

// "My deals" and "Credits" are sections of the Overview page itself
// (app/portal/page.tsx already shows both there, prominently) rather than
// separate routes — a merchant already has one place their deals and
// balance live, and splitting that across routes would mean fetching the
// same merchant/deals data twice for no real benefit. "Business profile"
// is a real route: it's a full grouped edit form, long enough that
// burying it in the Overview scroll would compete with the deals list
// the design brief wants leading the page.
const NAV_ITEMS = [
  { href: "/portal#overview", label: "Overview", icon: HomeIcon, match: (p: string) => p === "/portal" },
  { href: "/portal#deals", label: "My deals", icon: ReceiptIcon, match: (p: string) => p === "/portal" },
  { href: "/portal/profile", label: "Business profile", icon: StoreIcon, match: (p: string) => p === "/portal/profile" },
  { href: "/portal#credits", label: "Credits", icon: CreditCardIcon, match: (p: string) => p === "/portal" },
];

// Top-bar colours: brand purple with the white logo while the minimal logo
// is on (lib/brand.ts), white as before with the classic one.
const P = PURPLE_HEADER
  ? {
      logo: "onDark" as const,
      bar: "border-hp-purple-dark bg-hp-purple",
      muted: "text-white/80",
      member: "text-white/80",
      support: "text-white/80 hover:text-white",
      signOut: "border-white/40 text-white hover:bg-white/10",
    }
  : {
      logo: "onLight" as const,
      bar: "border-slate-200 bg-white",
      muted: "text-slate-500",
      member: "text-slate-600",
      support: "text-slate-500 hover:text-brand-700",
      signOut: "border-slate-200 text-slate-600 hover:bg-slate-50",
    };

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { member, isLoggedIn, logout } = useWix();

  return (
    <div className="min-h-screen bg-brand-50">
      <IdlePortalSignOut />

      {/* Top bar: brand + account access. Deliberately not the site's own
          Header — that carries a consumer search bar and city selector
          that mean nothing to a merchant managing their own business, and
          this needs account/sign-out controls Header doesn't have at all. */}
      <header className={`sticky top-0 z-30 border-b ${P.bar}`}>
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/portal" aria-label="MegaDeal business portal" className="flex shrink-0 items-center gap-2">
            <BrandLogo placement="portal" tone={P.logo} />
            <span className={`hidden text-sm sm:inline ${P.muted}`}>for business</span>
          </Link>
          {isLoggedIn && (
            <div className="flex min-w-0 items-center gap-3">
              <span className={`hidden max-w-[200px] truncate text-sm sm:inline ${P.member}`}>
                {member?.nickname || member?.email}
              </span>
              <a
                href="/contact"
                className={`hidden text-sm font-semibold sm:inline ${P.support}`}
              >
                Support
              </a>
              <button
                onClick={() => logout()}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${P.signOut}`}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={isLoggedIn ? "mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8" : ""}>
        {/* Signed-out visitors land on PortalAuthScreen's own sign-in card,
            which brings its own full-bleed layout — the dashboard nav has
            nothing to navigate to yet and would just crowd the card. */}
        {isLoggedIn && (
          <>
            {/* Mobile/tablet nav — a compact, horizontally scrollable row of
                the same 4 destinations instead of a full sidebar, stacked
                above the content so it never competes with it for width. */}
            <nav
              className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
              aria-label="Portal navigation"
            >
              {NAV_ITEMS.map((item) => {
                const active = item.match(pathname || "");
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-brand-200 bg-white text-brand-700"
                        : "border-slate-200 bg-white/60 text-slate-600"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-start gap-8">
              {/* Desktop sidebar — sticky under the top bar, replaced by the
                  horizontal nav row above on smaller screens. */}
              <nav className="sticky top-24 hidden w-52 shrink-0 flex-col gap-1 lg:flex" aria-label="Portal navigation">
                {NAV_ITEMS.map((item) => {
                  const active = item.match(pathname || "");
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        active ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:bg-white/70"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </>
        )}

        {/* Not wrapped in its own <main> — PortalAuthScreen (and the
            loading/error states above it) already renders one. */}
        {!isLoggedIn && children}
      </div>
    </div>
  );
}
