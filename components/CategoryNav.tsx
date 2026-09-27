"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { CATEGORIES } from "@/lib/categories";
import { homeHref, type HomeFilters } from "@/lib/homeFilters";
import { CompassIcon, DumbbellIcon, FlowerIcon, GridIcon, SuitcaseIcon, UtensilsIcon, WrenchIcon } from "./icons";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "food-drink": UtensilsIcon,
  "beauty-spa": FlowerIcon,
  "things-to-do": CompassIcon,
  "travel-getaways": SuitcaseIcon,
  "health-fitness": DumbbellIcon,
  "home-car": WrenchIcon,
};

type Props =
  | {
      /** On the homepage: each control filters the deals below, keeping the
       *  search, location, type and other filters. */
      mode: "filter";
      filters: HomeFilters;
      /** The homepage's path — "/" except in the local design harness. */
      basePath?: string;
      /** Changes the URL without a server round trip. */
      onNavigate: (href: string) => void;
    }
  | {
      /** Elsewhere: ordinary links to the canonical category pages. */
      mode: "link";
      /** Slug of the current category page, "" for none. */
      active: string;
    };

/**
 * The one category control. A single labelled row on desktop; on phones a
 * fixed grid — "All categories" across the top, the six categories in
 * three columns under it. Columns are sized in rem, so enlarged text or a
 * very narrow screen gets two wider columns instead of squeezed labels.
 * Nothing scrolls sideways or moves on its own.
 *
 * Every item is a real link, so it works before JavaScript loads and for
 * crawlers; on the homepage a click is intercepted to filter in place.
 */
export default function CategoryNav(props: Props) {
  const active = props.mode === "filter" ? props.filters.category : props.active;
  // The link itself always points at the category's own page — the
  // indexable one, with its own title and text — so search engines and
  // "open in new tab" get that. On the homepage a plain click filters the
  // deals in place instead, keeping the other filters.
  const pageHref = (slug: string) => (slug ? `/category/${slug}` : "/");
  const filterHref = (slug: string) =>
    props.mode === "filter" ? homeHref(props.filters, { category: slug }, props.basePath) : pageHref(slug);

  const items = [
    { slug: "", label: "All categories", Icon: GridIcon },
    ...CATEGORIES.map((c) => ({ slug: c.slug, label: c.name, Icon: ICONS[c.slug] ?? GridIcon })),
  ];

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (props.mode !== "filter") return;
    // Let modified clicks (new tab etc.) behave as normal links.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    props.onNavigate(href);
  }

  return (
    <nav aria-label="Categories">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,6.5rem),1fr))] gap-2 sm:grid-cols-3 lg:flex lg:gap-0 lg:border-b lg:border-hp-line">
        {items.map(({ slug, label, Icon }) => {
          const selected = active === slug;
          const href = pageHref(slug);
          const isAll = slug === "";
          return (
            <li key={slug || "all"} className={`${isAll ? "col-span-full" : ""} lg:min-w-0 lg:flex-1`}>
              <Link
                href={href}
                scroll={false}
                // On the homepage a click filters in place, so fetching the
                // category page ahead of time would be wasted work.
                prefetch={props.mode === "filter" ? false : undefined}
                onClick={(e) => handleClick(e, filterHref(slug))}
                aria-current={selected ? "true" : undefined}
                className={`group flex h-full items-center gap-1 rounded-[14px] border px-1.5 text-left min-[380px]:gap-1.5 min-[380px]:px-2 text-[0.8125rem] font-semibold leading-tight transition [text-wrap:balance] sm:gap-2.5 sm:px-3 sm:text-[0.875rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 lg:flex-col lg:justify-center lg:gap-2 lg:rounded-none lg:border-0 lg:border-b-[3px] lg:px-1 lg:pb-3 lg:pt-3 lg:text-center lg:text-[0.875rem] ${
                  isAll ? "min-h-[48px] justify-center" : "min-h-[60px]"
                } ${
                  selected
                    ? "border-hp-purple bg-hp-purple text-white lg:border-hp-purple lg:bg-transparent lg:text-hp-ink"
                    : "border-hp-line bg-white text-hp-ink hover:border-hp-boundary lg:border-transparent lg:bg-transparent lg:hover:border-hp-line"
                }`}
              >
                <span
                  className={`flex shrink-0 items-center justify-center lg:h-12 lg:w-12 lg:rounded-full ${
                    selected ? "text-white lg:bg-hp-purple" : "text-hp-purple lg:bg-hp-lavender lg:group-hover:bg-[#ECE4FA]"
                  }`}
                >
                  <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px] lg:h-6 lg:w-6" />
                </span>
                {/* min-w-0 + hyphens: with enlarged text a long word like
                    "Getaways" wraps inside the tile instead of spilling out. */}
                <span className={`min-w-0 hyphens-auto break-words ${selected ? "lg:font-bold" : ""}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
