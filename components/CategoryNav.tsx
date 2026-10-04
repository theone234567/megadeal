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
 * The one category control. A single labelled row on desktop; below that,
 * one row of chips the visitor swipes sideways by hand (it never moves on
 * its own), with the next chip cut off at the edge and a soft fade there
 * so it reads as "there's more". One row keeps the deals higher up the
 * screen than the old three-row grid did.
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
    <nav aria-label="Categories" className="relative">
      <ul className="scrollbar-hide -mx-4 flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 py-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:gap-0 lg:overflow-visible lg:border-b lg:border-hp-line lg:px-0 lg:py-0">
        {items.map(({ slug, label, Icon }) => {
          const selected = active === slug;
          const href = pageHref(slug);
          return (
            <li key={slug || "all"} className="shrink-0 snap-start lg:min-w-0 lg:flex-1 lg:shrink">
              <Link
                href={href}
                scroll={false}
                // On the homepage a click filters in place, so fetching the
                // category page ahead of time would be wasted work.
                prefetch={props.mode === "filter" ? false : undefined}
                onClick={(e) => handleClick(e, filterHref(slug))}
                aria-current={selected ? "true" : undefined}
                className={`group flex h-full min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[0.875rem] font-semibold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 lg:flex-col lg:justify-start lg:gap-2 lg:whitespace-normal xl:whitespace-nowrap lg:rounded-none lg:border-0 lg:border-b-[3px] lg:px-1 lg:pb-3 lg:pt-3 lg:text-center ${
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
                  <Icon className="h-[18px] w-[18px] lg:h-6 lg:w-6" />
                </span>
                <span className={`min-w-0 ${selected ? "lg:font-bold" : ""}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {/* The "more this way" hint on the swipe row; nothing to hint at on
          desktop, where every category fits. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -right-4 w-10 bg-gradient-to-l from-hp-page to-transparent sm:-right-6 lg:hidden"
      />
    </nav>
  );
}
