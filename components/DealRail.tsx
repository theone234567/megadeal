"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Deal } from "@/lib/types";
import DealCard from "./DealCard";
import { ArrowRightIcon, ChevronRightIcon } from "./icons";

/**
 * A row of deal cards that scrolls sideways: the homepage's curated
 * collections (the example deals and the launch deals before launch). Not for
 * search or filter results, which stay a grid.
 *
 * Plain native scrolling with snap points, so a phone swipes it and shows
 * part of the next card (about 1.2 across); about four across on a
 * computer, with a hint of the next. It never moves by itself. On a
 * computer the arrows beside the heading move it a card-width or so;
 * they're real buttons and sit outside the photos. The row itself can be
 * focused and scrolled with the keyboard. Cards aren't cloned, and photos
 * off to the side load lazily as usual (DealCard).
 */
export default function DealRail({
  id,
  title,
  description,
  deals,
  variant = "default",
  viewAll,
  empty,
  className = "",
  eagerCount = 0,
}: {
  /** For the heading's id and in-page links (#example-deals). */
  id: string;
  title: string;
  description?: ReactNode;
  deals: Deal[];
  variant?: "default" | "demo" | "launch";
  viewAll?: { href: string; label: string; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void };
  /** Shown in place of the row when there are no deals. */
  empty?: ReactNode;
  /** The first cards that load at once (T245): the row at the top of a
   *  page, whose first photo is often the largest thing on screen. */
  eagerCount?: number;
  className?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => setEnds({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [deals.length]);

  function step(direction: 1 | -1) {
    const el = listRef.current;
    if (!el) return;
    const card = el.querySelector("li");
    const by = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * by * (el.clientWidth > 900 ? 2 : 1), behavior: reduce ? "auto" : "smooth" });
  }

  const arrow = "flex h-10 w-10 items-center justify-center rounded-full border border-hp-line bg-white text-hp-ink shadow-sm transition hover:border-hp-boundary disabled:cursor-default disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple";

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`scroll-mt-24 ${className}`}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-heading`} className="font-display text-[1.5rem] font-bold leading-tight text-hp-ink lg:text-[1.75rem]">
            {title}
          </h2>
          {description && <p className="mt-1 max-w-[70ch] text-sm text-hp-muted sm:text-[0.9375rem]">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {viewAll && deals.length > 0 && (
            <Link
              href={viewAll.href}
              prefetch={false}
              scroll={false}
              onClick={viewAll.onClick}
              className="inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap text-sm font-semibold text-hp-purple underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
            >
              {viewAll.label}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          )}
          {deals.length > 1 && (
            <div className="hidden items-center gap-2 md:flex">
              <button type="button" onClick={() => step(-1)} disabled={ends.start} aria-label="Previous deals" aria-controls={`${id}-list`} className={arrow}>
                <ChevronRightIcon className="h-5 w-5 rotate-180" />
              </button>
              <button type="button" onClick={() => step(1)} disabled={ends.end} aria-label="Next deals" aria-controls={`${id}-list`} className={arrow}>
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {deals.length === 0 ? (
        empty
      ) : (
        <ul
          ref={listRef}
          id={`${id}-list`}
          // Focusable so a keyboard can scroll it.
          tabIndex={0}
          aria-label={title}
          className="scrollbar-hide -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hp-purple sm:-mx-6 sm:gap-4 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
        >
          {deals.map((deal, i) => (
            <li
              key={deal.id}
              className="w-[78%] shrink-0 snap-start min-[480px]:w-[46%] md:w-[31%] lg:w-[calc((100%-3rem)/4.15)]"
            >
              <DealCard
                deal={deal}
                variant={variant}
                priority={i < eagerCount}
                imageSizes="(min-width: 1200px) 270px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, (min-width: 480px) 46vw, 78vw"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
