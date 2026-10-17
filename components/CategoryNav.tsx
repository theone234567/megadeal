"use client";

import { cityPath } from "@/lib/cities";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { CATEGORIES } from "@/lib/categories";
import { homeHref, type HomeFilters } from "@/lib/homeFilters";
import { ChevronRightIcon, CompassIcon, DumbbellIcon, FlowerIcon, GridIcon, SuitcaseIcon, UtensilsIcon, WrenchIcon } from "./icons";

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
 * The one category control: a shallow strip of small icons and names, the
 * current one in purple and underlined. Every category shows in one row
 * where they fit; anywhere narrower the row scrolls sideways (swiped on a
 * phone, or with the arrow at either end, never moving on its own), with
 * the next item cut off at the edge so it reads as "there's more". Text is
 * never shrunk to squeeze them all in.
 *
 * Every item is a real link, so it works before JavaScript loads and for
 * crawlers; on the homepage a click is intercepted to filter in place.
 */
const categoryPage = (slug: string) => (slug ? `${cityPath()}/${slug}` : "/");

export default function CategoryNav(props: Props) {
  const active = props.mode === "filter" ? props.filters.category : props.active;
  const listRef = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState({ left: false, right: false });
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

  // The fades and arrows show only while there's more to scroll to.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () =>
      setMore({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
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

  // The arrows move the row by most of its width; it never moves on its own.
  function step(direction: 1 | -1) {
    const el = listRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: reduce ? "auto" : "smooth" });
  }

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
        className="scrollbar-hide -mx-4 flex gap-1 overflow-x-auto scroll-px-4 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:justify-between lg:gap-0 lg:scroll-px-0 lg:px-0"
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
                className={`-mb-px flex h-[52px] items-center gap-2 whitespace-nowrap border-b-[3px] px-2.5 text-[0.875rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hp-purple lg:px-2 lg:text-[0.9375rem] ${
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
      {/* "More this way": a fade and an arrow at each end that has more
          to show. The arrows are for a mouse; a keyboard tabs along the
          links (each scrolls into view) and a phone also swipes. */}
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          className={`pointer-events-none absolute inset-y-0 flex w-14 items-center transition-opacity ${
            side === "left"
              ? "-left-4 justify-start bg-gradient-to-r sm:-left-6 lg:left-0"
              : "-right-4 justify-end bg-gradient-to-l sm:-right-6 lg:right-0"
          } from-hp-page via-hp-page/90 to-transparent ${more[side] ? "opacity-100" : "opacity-0"}`}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => step(side === "left" ? -1 : 1)}
            className={`flex h-11 w-11 items-center justify-center ${more[side] ? "pointer-events-auto" : ""}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-hp-line bg-white text-hp-ink shadow-sm hover:border-hp-boundary">
              <ChevronRightIcon className={`h-4 w-4 ${side === "left" ? "rotate-180" : ""}`} />
            </span>
          </button>
        </div>
      ))}
    </nav>
  );
}
