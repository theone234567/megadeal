"use client";

import { cityPath } from "@/lib/cities";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";
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
 * The one category control: a shallow strip of small icons and names, the
 * current one in purple and underlined. Every category shows in one row
 * where they fit; anywhere narrower the row scrolls sideways (swiped by
 * hand on a phone, never moving on its own), with the next item cut off
 * at the edge and a soft fade there so it reads as "there's more". Text is
 * never shrunk to squeeze them all in.
 *
 * Every item is a real link, so it works before JavaScript loads and for
 * crawlers; on the homepage a click is intercepted to filter in place.
 */
export default function CategoryNav(props: Props) {
  const active = props.mode === "filter" ? props.filters.category : props.active;
  const listRef = useRef<HTMLUListElement>(null);
  const [moreRight, setMoreRight] = useState(false);
  // The link itself always points at the category's own page — the
  // indexable one, with its own title and text — so search engines and
  // "open in new tab" get that. On the homepage a plain click filters the
  // deals in place instead, keeping the other filters.
  const pageHref = (slug: string) => (slug ? `${cityPath()}/${slug}` : "/");
  const filterHref = (slug: string) =>
    props.mode === "filter" ? homeHref(props.filters, { category: slug }, props.basePath) : pageHref(slug);

  const items = [
    { slug: "", label: "All categories", Icon: GridIcon },
    ...CATEGORIES.map((c) => ({ slug: c.slug, label: c.name, Icon: ICONS[c.slug] ?? GridIcon })),
  ];

  // The fade shows only while there's more to scroll to.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // A category chosen off to the side (from a link, or after a reload)
  // is scrolled into view within the row. Only the row moves, never the
  // page.
  useEffect(() => {
    const el = listRef.current;
    const item = el?.querySelector<HTMLElement>('[aria-current="true"]')?.parentElement;
    if (!el || !item) return;
    const left = item.offsetLeft - el.offsetLeft;
    if (left < el.scrollLeft || left + item.offsetWidth > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = Math.max(0, left - 24);
    }
  }, [active]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (props.mode !== "filter") return;
    // Let modified clicks (new tab etc.) behave as normal links.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    props.onNavigate(href);
  }

  return (
    <nav aria-label="Categories" className="relative border-b border-hp-line">
      <ul
        ref={listRef}
        className="scrollbar-hide -mx-4 flex gap-1 overflow-x-auto scroll-px-4 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0 xl:justify-between"
      >
        {items.map(({ slug, label, Icon }) => {
          const selected = active === slug;
          const href = pageHref(slug);
          return (
            <li key={slug || "all"} className="shrink-0">
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
                className={`-mb-px flex h-[52px] items-center gap-2 whitespace-nowrap border-b-[3px] px-2.5 text-[0.875rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hp-purple lg:px-3 lg:text-[0.9375rem] ${
                  selected
                    ? "border-hp-purple text-hp-purple"
                    : "border-transparent text-hp-muted hover:border-hp-line hover:text-hp-ink"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0 lg:h-5 lg:w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* The "more this way" hint, only while the row has more to show. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 -right-4 w-10 bg-gradient-to-l from-hp-page to-transparent transition-opacity sm:-right-6 lg:right-0 ${
          moreRight ? "opacity-100" : "opacity-0"
        }`}
      />
    </nav>
  );
}
