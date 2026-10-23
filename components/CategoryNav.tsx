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

/** Names on a phone, short enough that about six of the seven fit across
 *  the screen. The link's accessible name stays the full name. */
const SHORT: Record<string, string> = {
  "food-drink": "Food",
  "beauty-spa": "Beauty",
  "things-to-do": "Things To Do",
  "travel-getaways": "Travel",
  "health-fitness": "Fitness",
  "home-car": "Home & Car",
};

/** The swipe hint has played for this visitor (this page load, if the
 *  browser keeps no storage). */
const HINT_KEY = "md-category-hint";
let hintPlayed = false;

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
      /** Live deals per category slug: the busiest come first (after
       *  "All"), ties in the usual order. */
      counts?: Record<string, number>;
    }
  | {
      /** Elsewhere: ordinary links to the canonical category pages. */
      mode: "link";
      /** Slug of the current category page, "" for none. */
      active: string;
    };

/**
 * The one category control, nothing moving on its own:
 * - on a computer: one row of small icons and names, every one on screen,
 *   the current one in purple and underlined;
 * - on a phone or tablet: icons above names in a row that swipes sideways,
 *   with short names on a phone so about six of seven show at once and the
 *   last peeks in at the edge. A fade marks the side with more; the
 *   current category is scrolled into view; and the first time a visitor
 *   sees the row it slides along a little and back, once, to show it
 *   swipes (not with reduced motion).
 * On the homepage the busiest categories come first (`counts`), so none
 * with deals is left off the end; "All" is always first.
 *
 * Every item is a real link, so it works before JavaScript loads and for
 * crawlers; on the homepage a click is intercepted to filter in place.
 */
const categoryPage = (slug: string) => (slug ? `${cityPath()}/${slug}` : "/");

export default function CategoryNav(props: Props) {
  const rowRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const active = props.mode === "filter" ? props.filters.category : props.active;
  // The link itself always points at the category's own page — the
  // indexable one, with its own title and text — so search engines and
  // "open in new tab" get that. On the homepage a plain click filters the
  // deals in place instead, keeping the other filters.
  const filterHref = (slug: string) =>
    props.mode === "filter" ? homeHref(props.filters, { category: slug }, props.basePath) : categoryPage(slug);
  const pageHref = (slug: string) => (props.mode === "filter" && props.homeLinks ? filterHref(slug) : categoryPage(slug));

  const counts = props.mode === "filter" ? props.counts : undefined;
  const categories = counts
    ? [...CATEGORIES].sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0))
    : CATEGORIES;
  const items = [
    { slug: "", label: "All", short: "All", Icon: GridIcon },
    ...categories.map((c) => ({ slug: c.slug, label: c.name, short: SHORT[c.slug] ?? c.name, Icon: ICONS[c.slug] ?? GridIcon })),
  ];

  // Which sides of the swipe row have more to see.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const update = () =>
      setEdges({ start: row.scrollLeft > 1, end: row.scrollLeft + row.clientWidth < row.scrollWidth - 1 });
    update();
    row.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  // The current category in view, e.g. arriving on ?category=home-car.
  useEffect(() => {
    const row = rowRef.current;
    const current = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !current || row.scrollWidth <= row.clientWidth) return;
    const r = row.getBoundingClientRect();
    const c = current.getBoundingClientRect();
    if (c.left >= r.left && c.right <= r.right) return;
    row.scrollLeft += c.left + c.width / 2 - (r.left + r.width / 2);
  }, [active]);

  // The one-time hint that the row swipes.
  useEffect(() => {
    const row = rowRef.current;
    if (!row || hintPlayed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (localStorage.getItem(HINT_KEY)) return;
    } catch {
      // No storage: played once per page load instead.
    }
    let touched = false;
    const stop = () => {
      touched = true;
    };
    const timers: number[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || row.scrollWidth <= row.clientWidth) return;
        observer.disconnect();
        hintPlayed = true;
        try {
          localStorage.setItem(HINT_KEY, "1");
        } catch {
          // As above.
        }
        timers.push(
          window.setTimeout(() => {
            if (touched || row.scrollLeft > 0) return;
            row.scrollTo({ left: 72, behavior: "smooth" });
            timers.push(window.setTimeout(() => !touched && row.scrollTo({ left: 0, behavior: "smooth" }), 700));
          }, 500)
        );
      },
      { threshold: 1 }
    );
    observer.observe(row);
    row.addEventListener("pointerdown", stop, { passive: true });
    row.addEventListener("wheel", stop, { passive: true });
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
      row.removeEventListener("pointerdown", stop);
      row.removeEventListener("wheel", stop);
    };
  }, []);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (props.mode !== "filter") return;
    // Let modified clicks (new tab etc.) behave as normal links.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    props.onNavigate(href);
  }

  return (
    <nav aria-label="Browse deals by category" className="relative lg:[container-type:inline-size]">
      {/* On a computer, one line with every label whole: the labels' size
          follows the row's own width (up to 15px), so the row always fits.
          Sized in rem alone, a browser set to larger text (Chrome's
          "Large") grew the labels past the row and every one was cut short
          ("A…", "Food & Dri…"). Shortening stays only as a last resort.
          Below that, the row runs edge to edge of the screen and swipes. */}
      <ul
        ref={rowRef}
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-hp-line px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:justify-between lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map(({ slug, label, short, Icon }) => {
          const selected = active === slug;
          const href = pageHref(slug);
          return (
            <li key={slug || "all"} className="shrink-0 lg:min-w-0 lg:shrink">
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
                aria-label={label}
                className={`flex h-[60px] min-w-[2.75rem] flex-col items-center justify-center gap-1 whitespace-nowrap border-b-[3px] px-1.5 text-[0.8125rem] font-semibold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hp-purple lg:-mb-px lg:h-[52px] lg:min-w-0 lg:flex-row lg:gap-1.5 lg:px-1.5 lg:text-[min(0.9375rem,1.3cqw)] xl:gap-2 xl:px-2 ${
                  selected
                    ? "border-hp-purple text-hp-purple"
                    : "border-transparent text-hp-muted hover:text-hp-ink lg:hover:border-hp-line"
                }`}
              >
                <Icon className="h-[22px] w-[22px] shrink-0 lg:h-[18px] lg:w-[18px] xl:h-5 xl:w-5" />
                <span className="md:hidden">{short}</span>
                <span className="hidden md:inline lg:truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {/* Fades over the side(s) with more to swipe to. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -left-4 bottom-px top-0 w-8 bg-gradient-to-r from-hp-page to-transparent transition-opacity sm:-left-6 lg:hidden ${
          edges.start ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-4 bottom-px top-0 w-10 bg-gradient-to-l from-hp-page to-transparent transition-opacity sm:-right-6 lg:hidden ${
          edges.end ? "opacity-100" : "opacity-0"
        }`}
      />
    </nav>
  );
}
