"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import ElephantMascot from "@/components/ElephantMascot";
import { SearchIcon, UserIcon } from "@/components/icons";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton"];

// Approved MegaDeal coming-soon logo artwork. Embedded so Cloudflare serves it
// with the app bundle instead of relying on another image host.
const COMING_SOON_LOGO =
  "data:image/webp;base64,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";

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
      .catch(() => {
        // Not fatal — worst case the badge just doesn't show this load.
      });
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
      <header className="relative z-30 bg-white">
        <div className="mx-auto flex max-w-[1680px] items-start justify-between gap-4 px-5 pb-1 pt-4 sm:px-8 lg:px-10 lg:pt-5">
          <div>
            <Link href="/coming-soon" aria-label="MegaDeal coming soon" className="inline-flex items-center">
              <img
                src={COMING_SOON_LOGO}
                alt="MegaDeal"
                className="h-auto w-[220px] sm:w-[250px]"
              />
            </Link>
            <p className="mt-0.5 pl-4 text-[11px] font-semibold tracking-[0.04em] text-[#776a9b] sm:text-xs">
              Local together.
            </p>
          </div>

          <Link
            href="/portal"
            className="mt-2 shrink-0 text-xs font-bold text-[#321475] transition hover:text-ember-500 sm:text-sm"
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
              <span className="text-[1.7rem] font-extrabold tracking-tight text-brand-700">
                Mega
              </span>
              <span className="-rotate-2 rounded-full bg-ember-500 px-2.5 py-0.5 text-[1.7rem] font-extrabold tracking-tight text-white shadow-card">
                Deal
              </span>
            </span>
            <ElephantMascot className="ml-1.5 -rotate-3" />
          </Link>

          <Link
            href="/portal"
            className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-700"
          >
            <span className="relative">
              <UserIcon className="h-4 w-4" />
              {isLoggedIn && !profileComplete && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ember-500"
                />
              )}
            </span>
            {isLoggedIn ? member?.profile?.nickname || "My portal" : "Business sign in"}
            {isLoggedIn && !profileComplete && (
              <span className="rounded-full bg-ember-50 px-2 py-0.5 text-xs font-semibold text-ember-600">
                1 step left
              </span>
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
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95"
          >
            Search
          </button>
        </form>
      </div>
    </header>
  );
}
