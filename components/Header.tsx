"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import ElephantMascot from "@/components/ElephantMascot";

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton"];

export default function Header() {
  const { member, isLoggedIn } = useWix();
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center">
          <Link href="/" className="flex items-center gap-0.5 font-display">
            <span className="text-[1.7rem] font-extrabold tracking-tight text-brand-700">
              Mega
            </span>
            <span className="-rotate-2 rounded-full bg-ember-500 px-2.5 py-0.5 text-[1.7rem] font-extrabold tracking-tight text-white shadow-card">
              Deal
            </span>
          </Link>
          <ElephantMascot className="-ml-2 -rotate-3" />
        </div>

        <form
          onSubmit={handleSearch}
          className="order-3 flex w-full flex-1 items-center gap-2 sm:order-none sm:w-auto"
        >
          <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 focus-within:border-brand-400">
            <span aria-hidden className="text-slate-400">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
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
            className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Search
          </button>
        </form>

        <Link
          href="/merchants"
          className="flex shrink-0 items-center rounded-full bg-ember-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-ember-600"
        >
          List your deal
        </Link>

        <Link
          href="/portal"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <span aria-hidden>👤</span>
          {isLoggedIn ? member?.profile?.nickname || "My portal" : "Sign in"}
        </Link>
      </div>
    </header>
  );
}
