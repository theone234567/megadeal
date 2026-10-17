"use client";

import { cityPath } from "@/lib/cities";
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
      /** Before launch the category pages are private, so the links stay
       *  on the homepage. */
      homeLinks?: boolean;
    }
  | {
      /** Elsewhere: ordinary links to the canonical category pages. */
      mode: "link";
      /** Slug of the current category page, "" for none. */
      active: string;
    };

/**
 * The one category control. Every category is always on screen, so none
 * (Home & Car, last in the list, included) is ever hidden off the edge of
 * a scrolling row or behind an arrow, and nothing moves on its own:
 * - on a computer: one row of small icons and names, the current one in
 *   purple and underlined;
 * - on a tablet: one row of equal tiles, icon above name;
 * - on a phone: the same tiles, four to a row (the second row centred).
 * Text is never shrunk to fit; a long name wraps onto two lines instead.
 *
 * Every item is a real link, so it works before JavaScript loads and for
 * crawlers; on the homepage a click is intercepted to filter in place.
 */
const categoryPage = (slug: string) => (slug ? `${cityPath()}/${slug}` : "/");

export default function CategoryNav(props: Props) {
  const active = props.mode === "filter" ? props.filters.category : props.active;
  // The link itself always points at the category's own page — the
  // indexable one, with its own title and text — so search engines and
  // "open in new tab" get that. On the homepage a plain click filters the
  // deals in place instead, keeping the other filters.
  const filterHref = (slug: string) =>
    props.mode === "filter" ? homeHref(props.filters, { category: slug }, props.basePath) : categoryPage(slug);
  const pageHref = (slug: string) => (props.mode === "filter" && props.homeLinks ? filterHref(slug) : categoryPage(slug));

  const items = [
    { slug: "", label: "All", Icon: GridIcon },
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
    <nav aria-label="Categories" className="lg:border-b lg:border-hp-line">
      <ul className="flex flex-wrap justify-center gap-2 sm:flex-nowrap lg:flex-wrap lg:justify-between lg:gap-0">
        {items.map(({ slug, label, Icon }) => {
          const selected = active === slug;
          const href = pageHref(slug);
          return (
            <li key={slug || "all"} className="w-[calc((100%-1.5rem)/4)] sm:w-auto sm:min-w-0 sm:flex-1 lg:flex-none">
              <Link
                href={href}
                scroll={false}
                // Never fetched ahead of time. On the homepage a click filters
                // in place; elsewhere, fetching all seven pages in the
                // background on every page view cost seven requests to the
                // site (against Cloudflare's daily allowance) for the one,
                // if any, the visitor taps. The page loads on the tap.
                prefetch={false}
                onClick={(e) => handleClick(e, filterHref(slug))}
                aria-current={selected ? "true" : undefined}
                className={`flex h-full min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center text-[0.75rem] font-semibold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple sm:text-[0.8125rem] lg:-mb-px lg:h-[52px] lg:min-h-0 lg:flex-row lg:gap-2 lg:whitespace-nowrap lg:rounded-none lg:border-0 lg:border-b-[3px] lg:px-2 lg:py-0 lg:text-[0.9375rem] lg:focus-visible:ring-inset ${
                  selected
                    ? "border-hp-purple/40 bg-hp-lavender text-hp-purple lg:border-hp-purple lg:bg-transparent"
                    : "border-hp-line bg-white text-hp-muted hover:border-hp-boundary hover:text-hp-ink lg:border-transparent lg:bg-transparent lg:hover:border-hp-line"
                }`}
              >
                <Icon className="h-[22px] w-[22px] shrink-0 lg:h-5 lg:w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
