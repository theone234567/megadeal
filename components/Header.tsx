"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import ElephantMascot from "@/components/ElephantMascot";
import { SearchIcon, UserIcon } from "@/components/icons";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton"];

function ComingSoonLogo() {
  return (
    <svg
      viewBox="0 0 345 88"
      className="h-auto w-[218px] sm:w-[248px]"
      role="img"
      aria-label="MegaDeal"
    >
      <defs>
        <linearGradient id="md-elephant" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9b63ff" />
          <stop offset="100%" stopColor="#6720dc" />
        </linearGradient>
        <filter id="md-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#5b25ba" floodOpacity="0.18" />
        </filter>
      </defs>

      <text
        x="2"
        y="57"
        fill="#5d18d6"
        fontFamily="Arial Rounded MT Bold, Arial, sans-serif"
        fontSize="48"
        fontWeight="900"
        letterSpacing="-3"
      >
        Mega
      </text>

      <g transform="translate(129 8) rotate(-2 61 34)" filter="url(#md-shadow)">
        <rect x="0" y="0" width="122" height="66" rx="17" fill="#ef159d" />
        <text
          x="12"
          y="49"
          fill="white"
          fontFamily="Arial Rounded MT Bold, Arial, sans-serif"
          fontSize="43"
          fontWeight="900"
          letterSpacing="-2"
        >
          Deal
        </text>
      </g>

      <g transform="translate(252 4)" filter="url(#md-shadow)">
        <ellipse cx="26" cy="36" rx="18" ry="21" fill="#b58aff" />
        <ellipse cx="70" cy="36" rx="18" ry="21" fill="#b58aff" />
        <ellipse cx="28" cy="36" rx="10" ry="13" fill="#f5b0df" />
        <ellipse cx="68" cy="36" rx="10" ry="13" fill="#f5b0df" />
        <ellipse cx="48" cy="34" rx="27" ry="25" fill="url(#md-elephant)" />
        <ellipse cx="48" cy="62" rx="21" ry="15" fill="url(#md-elephant)" />
        <ellipse cx="37" cy="73" rx="8" ry="11" fill="#7130dc" />
        <ellipse cx="59" cy="73" rx="8" ry="11" fill="#7130dc" />
        <path d="M53 46 C64 49 66 60 61 67 C58 72 54 68 56 64 C60 57 56 53 50 52" fill="none" stroke="#7130dc" strokeWidth="10" strokeLinecap="round" />
        <circle cx="38" cy="30" r="5.5" fill="#241046" />
        <circle cx="58" cy="30" r="5.5" fill="#241046" />
        <circle cx="39.8" cy="28.2" r="1.7" fill="white" />
        <circle cx="59.8" cy="28.2" r="1.7" fill="white" />
        <path d="M42 42 Q48 47 54 42" fill="none" stroke="#371150" strokeWidth="2.8" strokeLinecap="round" />
        <ellipse cx="48" cy="44" rx="4" ry="2.5" fill="#ff9dcb" />
      </g>
    </svg>
  );
}

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
        <div className="mx-auto flex max-w-[1440px] items-start justify-between gap-4 px-5 pb-2 pt-5 sm:px-8 lg:px-10 lg:pt-6">
          <div>
            <Link href="/coming-soon" aria-label="MegaDeal coming soon" className="inline-flex items-center">
              <ComingSoonLogo />
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
