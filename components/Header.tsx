"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import ElephantMascot from "@/components/ElephantMascot";
import { SearchIcon, UserIcon } from "@/components/icons";
import { fredoka } from "@/lib/fonts";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton"];

export default function Header() {
  const { member, isLoggedIn } = useWix();
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";

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
      <header className="relative z-40 border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-5 px-5 py-3 sm:px-8 lg:px-10 lg:py-4 xl:max-w-[1320px] 2xl:max-w-[1460px]">
          <Link href="/" aria-label="MegaDeal home" className="group inline-flex shrink-0 items-center">
            <span className="relative block pr-[76px] sm:pr-[92px]">
              <span className={`${fredoka.className} flex items-center leading-none tracking-[-0.045em]`}>
                <span className="text-[38px] font-bold text-brand-700 sm:text-[44px] lg:text-[48px]">Mega</span>
                <span
                  className="ml-1 -rotate-2 bg-ember-500 px-3 py-1.5 text-[35px] font-bold text-white shadow-sm sm:text-[41px] lg:text-[45px]"
                  style={{ clipPath: "polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%)" }}
                >
                  Deal
                </span>
              </span>
              <span className="mt-1.5 block pl-1 text-[11px] font-semibold tracking-[0.03em] text-slate-500 sm:text-xs">
                Local together.
              </span>
              <Image
                src="/brand/deal-hunter-elephant.svg"
                alt=""
                aria-hidden="true"
                width={130}
                height={102}
                className="pointer-events-none absolute -right-1 -top-7 h-[78px] w-[100px] object-contain transition-transform duration-200 group-hover:-rotate-2 group-hover:scale-105 sm:-right-2 sm:-top-8 sm:h-[90px] sm:w-[116px] lg:h-[98px] lg:w-[126px]"
              />
            </span>
          </Link>

          <Link
            href="/portal"
            className="shrink-0 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-extrabold text-brand-700 transition hover:border-brand-700 hover:bg-brand-50 sm:text-sm"
          >
            Business sign in →
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-y-1">
          <Link href="/" className="flex items-center gap-0.5 font-display">
            <span className="animate-wordmark-shake items-center gap-0.5">
              <span className="text-[1.7rem] font-extrabold tracking-tight text-brand-700">Mega</span>
              <span className="-rotate-2 rounded-full bg-ember-500 px-2.5 py-0.5 text-[1.7rem] font-extrabold tracking-tight text-white shadow-card">Deal</span>
            </span>
            <ElephantMascot className="ml-1.5 -rotate-3" />
          </Link>

          <Link href="/portal" className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-700">
            <span className="relative">
              <UserIcon className="h-4 w-4" />
              {isLoggedIn && !profileComplete && (
                <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ember-500" />
              )}
            </span>
            {isLoggedIn ? member?.profile?.nickname || "My portal" : "Business sign in"}
            {isLoggedIn && !profileComplete && (
              <span className="rounded-full bg-ember-50 px-2 py-0.5 text-xs font-semibold text-ember-600">1 step left</span>
            )}
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex w-full items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 focus-within:border-brand-400">
            <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              aria-label="Search deals"
              placeholder="Search massages, dinners, getaways…"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
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
