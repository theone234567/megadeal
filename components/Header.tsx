"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import Logo from "@/components/Logo";
import { SearchIcon, UserIcon } from "@/components/icons";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton"];

export default function Header() {
  const { member, isLoggedIn } = useWix();
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";

  // The site header used to have two different logo treatments — the
  // supplied raster wordmark (public/megadeal/megadeal-logo.webp)
  // everywhere, and this SVG lockup only on /coming-soon. That meant most
  // of the site (about, portal, admin, every legal page) still showed the
  // older cluttered logo after the SVG one was refined, since nothing
  // else routed through it. The SVG is now the one logo everywhere.
  const brand = (sizeClass: string) => <Logo className={sizeClass} />;

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

  if (isComingSoon) {
    return (
      <header className="relative z-50 border-b border-[#eeeaf5] bg-white">
        <div className="mx-auto flex min-h-[94px] w-full max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:min-h-[108px] sm:gap-5 sm:px-8 lg:min-h-[118px] lg:px-10 xl:px-12">
          <Link href="/coming-soon" aria-label="MegaDeal home" className="min-w-0 shrink">
            {brand("text-[34px] sm:text-[42px] lg:text-[48px] xl:text-[52px]")}
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
            {brand("max-h-[34px] text-[24px] sm:max-h-[40px] sm:text-[28px]")}
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
