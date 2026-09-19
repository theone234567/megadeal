"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import { useMegadealArt } from "@/context/MegadealArtProvider";
import Logo from "@/components/Logo";
import { SearchIcon, UserIcon } from "@/components/icons";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton"];

export default function Header() {
  const { member, isLoggedIn } = useWix();
  const art = useMegadealArt();
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";
  const isRestaurantLanding = pathname === "/advertise/restaurants";

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
  const LOGO_SIZE = {
    imageHeight: "h-9 sm:h-11 lg:h-12",
    svgTextSize: "text-[19px] sm:text-[23px] lg:text-[25px]",
  };

  // The supplied lockup (elephant peeking over the "MegaDeal" wordmark,
  // "Deal" styled as a price tag) is the real logo. Falls back to the
  // plain SVG mark only if the file hasn't been supplied yet — which
  // needs its own font-size-based sizing (it scales itself in em units)
  // rather than the image's height classes, hence LOGO_SIZE carries both.
  const brand = () =>
    art.logo ? (
      <Image
        src={art.logo}
        alt="MegaDeal"
        width={2172}
        height={724}
        priority
        className={`w-auto select-none object-contain ${LOGO_SIZE.imageHeight}`}
      />
    ) : (
      <Logo className={LOGO_SIZE.svgTextSize} />
    );

  const [profileComplete, setProfileComplete] = useState(true);
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    fetch("/api/merchants/me")
      .then((res) => (res.ok ? res.json() : { item: null }))
      .then(({ item }) => {
        if (!cancelled) setProfileComplete(Boolean(!item || (item.address && item.category)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  // Compact, purpose-built header for the restaurant advertising landing
  // page — the standard header's search bar and city selector have nothing
  // to do with a page whose only job is getting a restaurant owner into
  // signup, and would compete with that page's own CTA. Sticky (unlike the
  // coming-soon header) so "List my restaurant" stays reachable on a page
  // long enough to need it.
  if (isRestaurantLanding) {
    return (
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-[87px] w-full max-w-[1184px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/advertise/restaurants" aria-label="MegaDeal home" className="flex min-w-0 shrink items-center gap-2">
            {brand()}
            <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:inline-block">
              for business
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#241138] lg:flex">
            <a href="#why-megadeal" className="transition hover:text-[#6519C7]">
              Why MegaDeal
            </a>
            <a href="#how-it-works" className="transition hover:text-[#6519C7]">
              How it works
            </a>
            <a href="#questions" className="transition hover:text-[#6519C7]">
              FAQs
            </a>
          </nav>

          <a
            href="#launch-offer"
            data-cta-section="header"
            className="shrink-0 rounded-full bg-[#C81287] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#DC168F] sm:px-5 sm:text-sm"
          >
            List my restaurant
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
            className="shrink-0 rounded-full border border-[#b99aee] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5f1cc8] transition hover:border-[#6d24dc] hover:bg-[#faf8ff] sm:px-5 sm:text-sm lg:px-6 lg:py-3"
          >
            <span className="sm:hidden">Sign in →</span>
            <span className="hidden sm:inline">Business sign in →</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-y-1">
          <Link href="/" aria-label="MegaDeal home" className="min-w-0 shrink">
            {brand()}
          </Link>

          <Link href="/portal" className="flex shrink-0 items-center gap-1.5 py-2 text-sm font-semibold text-slate-600 hover:text-brand-700">
            <span className="relative">
              <UserIcon className="h-4 w-4" />
              {isLoggedIn && !profileComplete && (
                <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ember-500" />
              )}
            </span>
            {isLoggedIn ? member?.nickname || "My portal" : "Business sign in"}
            {isLoggedIn && !profileComplete && (
              <span className="rounded-full bg-ember-50 px-2 py-0.5 text-xs font-semibold text-ember-600">1 step left</span>
            )}
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex w-full items-center gap-2">
          <label className="flex flex-1 cursor-text items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 focus-within:border-brand-400">
            <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              aria-label="Search deals"
              placeholder="Search massages, dinners, getaways…"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="Choose your city"
            className="hidden shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none sm:block"
          >
            <option value="">All cities</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95">
            Search
          </button>
        </form>
      </div>
    </header>
  );
}
