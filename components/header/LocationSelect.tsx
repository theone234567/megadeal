"use client";

import { usePathname, useRouter } from "next/navigation";
import { useUrlSearch } from "@/lib/useUrlSearch";
import { ChevronDownIcon, MapPinIcon } from "@/components/icons";
import { PURPLE_HEADER } from "@/lib/brand";
import { goHome } from "./HeaderSearch";
import { DEFAULT_CITY } from "@/lib/cities";

export const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton"];

/** MegaDeal is in Auckland only for now: the picker reads "Auckland" and
 *  the other cities are listed as coming soon, rather than leading to an
 *  empty page. */
const OPEN_CITIES = [DEFAULT_CITY.name];

function Select({ city }: { city: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const known = CITIES.find((c) => c.toLowerCase() === city.toLowerCase());

  return (
    <label
      className={`relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2 text-sm font-semibold focus-within:ring-2 ${
        PURPLE_HEADER ? "text-white hover:bg-white/10 focus-within:ring-white" : "text-hp-ink hover:bg-hp-lavender focus-within:ring-hp-purple"
      }`}
    >
      <MapPinIcon className={`h-[18px] w-[18px] shrink-0 ${PURPLE_HEADER ? "text-white" : "text-hp-ink"}`} />
      <span className="sr-only">Location</span>
      {/* A native select: keyboard, screen-reader and phone pickers all
          work without any custom widget code. It sits on top of the
          visible label, transparent, so the whole pill is the control. */}
      <span aria-hidden className="max-w-[7.5rem] truncate">
        {known ?? (city || DEFAULT_CITY.name)}
      </span>
      <ChevronDownIcon className={`h-4 w-4 shrink-0 ${PURPLE_HEADER ? "text-white/80" : "text-hp-muted"}`} />
      <select
        value={known && !OPEN_CITIES.includes(known) ? known : known ? "" : city}
        onChange={(e) => goHome(pathname, router, { city: e.target.value })}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {/* Every deal is in Auckland for now, so "Auckland" is no filter. */}
        <option value="">{DEFAULT_CITY.name}</option>
        {CITIES.filter((c) => !OPEN_CITIES.includes(c)).map((c) => (
          <option key={c} value={c} disabled>
            {c} (coming soon)
          </option>
        ))}
        {city && !known && <option value={city}>{city}</option>}
      </select>
    </label>
  );
}

export default function LocationSelect() {
  return <Select city={(useUrlSearch().get("city") ?? "").trim()} />;
}
