"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, MapPinIcon } from "@/components/icons";
import { goHome } from "./HeaderSearch";

export const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton"];

function Select({ city }: { city: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const known = CITIES.find((c) => c.toLowerCase() === city.toLowerCase());

  return (
    <label className="relative flex h-11 shrink-0 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-hp-ink hover:bg-hp-lavender focus-within:ring-2 focus-within:ring-hp-purple">
      <MapPinIcon className="h-[18px] w-[18px] shrink-0 text-hp-ink" />
      <span className="sr-only">Location</span>
      {/* A native select: keyboard, screen-reader and phone pickers all
          work without any custom widget code. It sits on top of the
          visible label, transparent, so the whole pill is the control. */}
      <span aria-hidden className="max-w-[7.5rem] truncate">
        {known ?? (city || "All areas")}
      </span>
      <ChevronDownIcon className="h-4 w-4 shrink-0 text-hp-muted" />
      <select
        value={known ?? city}
        onChange={(e) => goHome(pathname, router, { city: e.target.value })}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="">All areas</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        {city && !known && <option value={city}>{city}</option>}
      </select>
    </label>
  );
}

function SelectWithParams() {
  const searchParams = useSearchParams();
  return <Select city={(searchParams.get("city") ?? "").trim()} />;
}

export default function LocationSelect({ withParams }: { withParams: boolean }) {
  return withParams ? <SelectWithParams /> : <Select city="" />;
}
