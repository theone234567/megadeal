"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Deal } from "@/lib/types";
import { useWithTestDeals } from "@/lib/useTestDeals";
import { useUserLocation, type LocationStatus } from "@/lib/geo";
import { pushUrl, useUrlSearch } from "@/lib/useUrlSearch";
import { SORT_OPTIONS, dealDistanceKm, type SortOption } from "@/lib/sortDeals";
import { categoryBySlug } from "@/lib/categories";
import {
  DISTANCE_OPTIONS,
  PRICE_BANDS,
  hasNarrowingFilters,
  homeHref,
  matchDeals,
  parseHomeFilters,
  splitByType,
  type DealType,
  type HomeFilters,
  type PriceBand,
} from "@/lib/homeFilters";
import CategoryNav from "@/components/CategoryNav";
import DealCard from "@/components/DealCard";
import DealGrid from "@/components/DealGrid";
import { ArrowRightIcon, ChevronDownIcon, CloseIcon, MapPinIcon, SlidersIcon, TagIcon, ZapIcon } from "@/components/icons";

const DealsMap = dynamic(() => import("@/components/DealsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-hp-line bg-white text-sm text-hp-muted">
      Loading map…
    </div>
  ),
});

type View = "grid" | "map";

const TYPE_OPTIONS: { value: DealType; label: string }[] = [
  { value: "all", label: "All deals" },
  { value: "everyday", label: "Everyday Deals" },
  { value: "flash", label: "Flash Deals" },
];

/** Changes the URL without a server round trip (lib/useUrlSearch.ts). */
const navigate = pushUrl;

/** A link that filters in place on a plain click, and still works as a
 *  normal link before JavaScript loads or when opened in a new tab. */
function FilterLink({
  href,
  className,
  children,
  ...rest
}: { href: string; className: string; children: React.ReactNode } & React.AriaAttributes) {
  return (
    <Link
      href={href}
      scroll={false}
      // A click never navigates (it filters in place), so there's nothing
      // worth fetching ahead of time.
      prefetch={false}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      className={className}
      {...rest}
    >
      {children}
    </Link>
  );
}

/**
 * The homepage's browsing area: categories, deal type, filters and the
 * Flash and Everyday collections, all driven by one set of filters in the
 * URL (lib/homeFilters.ts). Deals arrive server-rendered from app/page.tsx;
 * everything here filters that list in the browser.
 */
export default function HomeDeals({
  initialDeals,
  initialSearch = "",
  basePath = "/",
  testDeals = false,
}: {
  initialDeals: Deal[];
  /** Add the admin's test deals (pre-launch previews only). */
  testDeals?: boolean;
  /** The query string the server rendered with. */
  initialSearch?: string;
  basePath?: string;
}) {
  const searchParams = useUrlSearch(initialSearch);
  const filters = parseHomeFilters(searchParams);
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<View>("grid");
  const { coords, status: locationStatus, request: requestLocation } = useUserLocation();
  const needsLocation = filters.sort === "nearest" || filters.within !== null;

  // Location is only ever asked for because the visitor chose "Nearest"
  // or a distance — never on page load.
  useEffect(() => {
    if (needsLocation && locationStatus === "idle") requestLocation();
  }, [needsLocation, locationStatus, requestLocation]);

  // Re-check every 30s so a deal that expires while the page is open drops
  // out on its own.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const allDeals = useWithTestDeals(initialDeals, testDeals);
  const matching = matchDeals(allDeals, filters, now, coords);
  const { flash, everyday } = splitByType(matching, filters.type);
  const shown = filters.type === "flash" ? flash.length : filters.type === "everyday" ? everyday.length : matching.length;

  const href = (patch: Partial<HomeFilters>) => homeHref(filters, patch, basePath);
  const set = (patch: Partial<HomeFilters>) => navigate(href(patch));

  return (
    <div id="deals" className="scroll-mt-[140px] lg:scroll-mt-24">
      {filters.q && <h1 className="sr-only">Search results for {filters.q}</h1>}

      <div className="mt-4 lg:mt-5">
        <CategoryNav mode="filter" filters={filters} basePath={basePath} onNavigate={navigate} />
      </div>

      <Controls
        href={href}
        filters={filters}
        set={set}
        view={view}
        setView={setView}
        shown={shown}
        locationStatus={locationStatus}
        onRetryLocation={requestLocation}
        needsLocation={needsLocation}
      />

      <ResultSummary href={href} filters={filters} shown={shown} />

      {view === "map" ? (
        <div className="mt-4">
          <DealsMap
            deals={filters.type === "flash" ? flash : filters.type === "everyday" ? everyday : matching}
            userLocation={coords}
          />
        </div>
      ) : (
        // Keyed on the filters so "Load more" starts over when they change.
        <Collections
          key={searchParams.toString()}
          href={href}
          filters={filters}
          flash={flash}
          everyday={everyday}
          coords={coords}
        />
      )}
    </div>
  );
}

type HrefFor = (patch: Partial<HomeFilters>) => string;

function Controls({
  href,
  filters,
  set,
  view,
  setView,
  shown,
  locationStatus,
  onRetryLocation,
  needsLocation,
}: {
  href: HrefFor;
  filters: HomeFilters;
  set: (patch: Partial<HomeFilters>) => void;
  view: View;
  setView: (v: View) => void;
  shown: number;
  locationStatus: LocationStatus;
  onRetryLocation: () => void;
  needsLocation: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const activeCount = [filters.price, filters.within, filters.sort !== "ending" ? filters.sort : ""].filter(Boolean).length;

  const selects = (
    <>
      <PillSelect
        label="Price"
        value={filters.price}
        onChange={(v) => set({ price: v as PriceBand })}
        options={[{ value: "", label: "Any price" }, ...PRICE_BANDS.map((b) => ({ value: b.value, label: b.label }))]}
      />
      <PillSelect
        label="Distance"
        value={filters.within ? String(filters.within) : ""}
        onChange={(v) => set({ within: v ? Number(v) : null })}
        options={[
          { value: "", label: "Any distance" },
          ...DISTANCE_OPTIONS.map((km) => ({ value: String(km), label: `Within ${km} km` })),
        ]}
      />
      <PillSelect
        label="Sort by"
        value={filters.sort === "ending" ? "" : filters.sort}
        onChange={(v) => set({ sort: (v || "ending") as SortOption })}
        options={[
          { value: "", label: "Ending soon" },
          ...SORT_OPTIONS.filter((o) => o.value !== "ending").map((o) => ({
            value: o.value,
            label: o.value === "nearest" ? "Nearest to me" : o.label,
          })),
        ]}
      />
    </>
  );

  const viewToggle = (
    <div role="group" aria-label="Show deals as" className="flex shrink-0 overflow-hidden rounded-full border border-hp-line bg-white">
      {(["grid", "map"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          aria-pressed={view === v}
          className={`min-h-[40px] px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hp-purple ${
            view === v ? "bg-hp-purple text-white" : "text-hp-ink hover:bg-hp-lavender"
          }`}
        >
          {v === "grid" ? "Grid" : "Map"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mt-4 lg:mt-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Plain buttons with a pressed state rather than tabs: they filter
            the one list below instead of switching between panels. */}
        <div role="group" aria-label="Deal type" className="grid grid-cols-3 gap-2 lg:flex lg:gap-2.5">
          {TYPE_OPTIONS.map((t) => {
            const selected = filters.type === t.value;
            return (
              <FilterLink
                key={t.value}
                href={href({ type: t.value })}
                aria-current={selected ? "true" : undefined}
                className={`flex min-h-[44px] items-center justify-center rounded-full border px-2 text-center text-[0.8125rem] font-semibold leading-tight transition sm:px-3 sm:text-[0.875rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 lg:px-5 ${
                  selected
                    ? "border-hp-purple bg-hp-purple text-white"
                    : "border-hp-line bg-white text-hp-ink hover:border-hp-boundary"
                }`}
              >
                {/* Short labels on the narrowest phones, where three equal
                    pills can't fit "Everyday Deals" on one line. */}
                <span className="whitespace-nowrap min-[400px]:hidden">{t.label.replace(/ deals$/i, "")}</span>
                <span className="hidden whitespace-nowrap min-[400px]:inline">{t.label}</span>
              </FilterLink>
            );
          })}
        </div>

        {/* Desktop: the filters sit in the row. */}
        <div className="hidden items-center gap-2.5 lg:flex">
          {selects}
          {viewToggle}
        </div>

        {/* Phones and tablets: where the deals are, and one Filters button. */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <p className="flex min-w-0 items-center gap-1.5 text-[0.9375rem] text-hp-ink">
            <MapPinIcon className="h-[18px] w-[18px] shrink-0" />
            <span className="min-w-0">Deals in {filters.city || "all areas"}</span>
          </p>
          <button
            ref={openerRef}
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            aria-haspopup="dialog"
            className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border-[1.5px] border-hp-purple bg-white px-4 text-[0.9375rem] font-semibold text-hp-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
          >
            <SlidersIcon className="h-5 w-5" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>

      {needsLocation && <LocationNote status={locationStatus} onRetry={onRetryLocation} />}

      <dialog
        ref={dialogRef}
        aria-labelledby="filters-title"
        onClose={() => openerRef.current?.focus()}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="mx-auto mb-0 mt-auto w-full max-w-lg rounded-t-3xl bg-white p-0 text-hp-ink shadow-xl backdrop:bg-hp-ink/40 sm:mb-auto sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-hp-line px-5 py-4">
          <h2 id="filters-title" className="font-display text-xl font-bold">
            Filters
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close filters"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5 [&_label]:w-full">
          {selects}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Show as</span>
            {viewToggle}
          </div>
        </div>
        <div className="border-t border-hp-line px-5 py-4">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-hp-purple text-base font-bold text-white hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
          >
            Show {shown} deal{shown === 1 ? "" : "s"}
          </button>
        </div>
      </dialog>
    </div>
  );
}

/** A native select dressed as a pill: the label shows the current choice. */
function PillSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const current = options.find((o) => o.value === value);
  return (
    <label
      className={`relative flex min-h-[44px] items-center justify-between gap-2 rounded-full border px-4 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-hp-purple focus-within:ring-offset-2 lg:min-w-[8.5rem] ${
        value ? "border-hp-purple bg-hp-lavender text-hp-purple" : "border-hp-line bg-white text-hp-ink hover:border-hp-boundary"
      }`}
    >
      <span aria-hidden>{value && current ? current.label : label}</span>
      <ChevronDownIcon className="h-4 w-4 shrink-0" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LocationNote({ status, onRetry }: { status: LocationStatus; onRetry: () => void }) {
  let text: React.ReactNode = null;
  if (status === "loading") text = "Finding your location…";
  if (status === "denied")
    text = (
      <>
        Location access is blocked, so distance can&apos;t be measured. Allow location for this site in your browser,
        then{" "}
        <button type="button" onClick={onRetry} className="font-semibold text-hp-purple underline">
          try again
        </button>
        .
      </>
    );
  if (status === "unsupported" || status === "error")
    text = "Couldn't get your location, so deals aren't filtered or sorted by distance.";
  if (!text) return null;
  return (
    <p role="status" className="mt-3 text-sm text-hp-muted">
      {text}
    </p>
  );
}

function ResultSummary({ href, filters, shown }: { href: HrefFor; filters: HomeFilters; shown: number }) {
  if (!hasNarrowingFilters(filters)) return null;
  const categoryName = filters.category ? categoryBySlug(filters.category)?.name : null;
  const parts = [
    filters.q ? `for “${filters.q}”` : "",
    categoryName ? `in ${categoryName}` : "",
    filters.city ? `in ${filters.city}` : "",
  ].filter(Boolean);
  return (
    <p role="status" className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[0.9375rem] text-hp-ink">
      <span>
        <strong>{shown}</strong> deal{shown === 1 ? "" : "s"} {parts.join(" ")}
      </span>
      <FilterLink
        href={href({ q: "", city: "", category: "", price: "", within: null })}
        className="font-semibold text-hp-purple underline-offset-2 hover:underline"
      >
        Clear filters
      </FilterLink>
    </p>
  );
}

const FLASH_SUBTITLE_LONG = "Live for up to 6 hours. Catch them while they're here.";
const EVERYDAY_SUBTITLE_LONG = "More time to discover something good.";

function Collections({
  href,
  filters,
  flash,
  everyday,
  coords,
}: {
  href: HrefFor;
  filters: HomeFilters;
  flash: Deal[];
  everyday: Deal[];
  coords: ReturnType<typeof useUserLocation>["coords"];
}) {
  const explicit = filters.type !== "all";
  const step = explicit ? 16 : 8;
  // Only on the plain homepage view, not in the middle of a search.
  const inviteBusinesses = !explicit && !hasNarrowingFilters(filters);
  const [everydayLimit, setEverydayLimit] = useState(step);

  const card = (d: Deal) => <DealCard deal={d} distanceKm={dealDistanceKm(d, coords)} />;

  if (!explicit && flash.length === 0 && everyday.length === 0) {
    return (
      <EmptyState
        href={href}
        filters={filters}
        message={
          hasNarrowingFilters(filters)
            ? "No deals match these filters right now."
            : "New local deals are on the way — check back soon."
        }
      />
    );
  }

  return (
    // min-w-0 on each section: a flex item otherwise grows to fit the
    // Flash row's full width instead of letting the row scroll inside it.
    <div className="mt-5 flex flex-col gap-8 lg:mt-6 lg:gap-10 [&>section]:min-w-0">
      {/* The homepage leaves the Flash row out when there are none; the
          Flash view says so instead. */}
      {(filters.type === "flash" || (filters.type === "all" && flash.length > 0)) && (
        <section aria-labelledby="flash-heading">
          <CollectionHeader
            id="flash-heading"
            icon={<ZapIcon className="h-5 w-5 text-hp-flash lg:h-6 lg:w-6" />}
            title="Flash Deals"
            subtitle={FLASH_SUBTITLE_LONG}
            shortSubtitle="Live for up to 6 hours."
            viewAll={explicit ? null : { href: href({ type: "flash" }), label: "View all Flash Deals" }}
          />
          {explicit ? (
            flash.length > 0 ? (
              <DealGrid deals={flash} userLocation={coords} />
            ) : (
              <EmptyState
                href={href}
                filters={filters}
                message="No Flash Deals match right now. Flash Deals run for up to 6 hours, so check back soon."
                alternative={{ href: href({ type: "everyday" }), label: "See Everyday Deals" }}
              />
            )
          ) : (
            // Phones: a row swiped by hand, with the next card peeking in.
            // Wider screens: one row of three or four, then "View all".
            <ul className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 lg:gap-5">
              {flash.slice(0, 8).map((d, i) => (
                <li
                  key={d.id}
                  className={`w-[84%] max-w-[22rem] shrink-0 snap-start md:w-auto md:max-w-none ${
                    i === 3 ? "md:hidden lg:block" : i > 3 ? "md:hidden" : ""
                  }`}
                >
                  {card(d)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* After the first deal section; last if there are no Flash Deals. */}
      {inviteBusinesses && flash.length > 0 && <BusinessInvite />}

      {filters.type !== "flash" && (
        <section aria-labelledby="everyday-heading">
          <CollectionHeader
            id="everyday-heading"
            icon={<TagIcon className="h-5 w-5 lg:h-6 lg:w-6" />}
            title="Everyday Deals"
            subtitle={EVERYDAY_SUBTITLE_LONG}
            shortSubtitle="More time to discover."
            viewAll={
              explicit || everyday.length === 0
                ? null
                : { href: href({ type: "everyday" }), label: "View all Everyday Deals" }
            }
          />
          {everyday.length > 0 ? (
            <>
              <DealGrid deals={everyday.slice(0, everydayLimit)} userLocation={coords} />
              {everyday.length > everydayLimit && (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setEverydayLimit((n) => n + step)}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-hp-purple bg-white px-6 text-[0.9375rem] font-semibold text-hp-purple hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 sm:w-auto"
                  >
                    Load more Everyday Deals
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              href={href}
              filters={filters}
              message={
                explicit
                  ? "No Everyday Deals match right now."
                  : "No Everyday Deals match right now — only the Flash Deals above."
              }
              alternative={explicit ? { href: href({ type: "flash" }), label: "See Flash Deals" } : undefined}
            />
          )}
        </section>
      )}

      {inviteBusinesses && flash.length === 0 && <BusinessInvite />}
    </div>
  );
}

/**
 * The one business invitation on the homepage: a quiet panel between the
 * deal sections, not a second hero. "Business sign in" stays in the
 * header; it's repeated here as a text link for a business owner who
 * scrolled straight to this panel.
 */
function BusinessInvite() {
  return (
    <aside
      aria-labelledby="business-invite-heading"
      className="flex flex-col gap-4 rounded-2xl border border-hp-line bg-hp-lavender px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"
    >
      <div className="min-w-0">
        <h2 id="business-invite-heading" className="text-lg font-bold text-hp-ink">
          Own a local business?
        </h2>
        <p className="mt-1 text-[0.9375rem] text-hp-ink">
          Put your next deal in front of Auckland customers. They contact and pay you directly.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/list-your-business" className="btn-primary">
          Sign up &amp; list a deal
        </Link>
        <Link
          href="/portal"
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-hp-purple underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
        >
          Business sign in
        </Link>
      </div>
    </aside>
  );
}

function CollectionHeader({
  id,
  icon,
  title,
  subtitle,
  shortSubtitle,
  viewAll,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  shortSubtitle: string;
  viewAll: { href: string; label: string } | null;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3 lg:items-center">
      <div className="flex min-w-0 items-start gap-2 lg:items-center lg:gap-3">
        <span className="mt-0.5 shrink-0 text-hp-purple lg:mt-0">{icon}</span>
        <div className="min-w-0 lg:flex lg:items-baseline lg:gap-4">
          <h2 id={id} className="font-display text-[1.375rem] font-semibold leading-tight text-hp-ink lg:text-[1.625rem]">
            {title}
          </h2>
          <p className="text-sm text-hp-muted lg:text-[0.9375rem]">
            <span className="lg:hidden">{shortSubtitle}</span>
            <span className="hidden lg:inline">{subtitle}</span>
          </p>
        </div>
      </div>
      {viewAll && (
        <FilterLink
          href={viewAll.href}
          aria-label={viewAll.label}
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-1 text-[0.9375rem] font-semibold text-hp-purple hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
        >
          <span className="lg:hidden">View all</span>
          <span className="hidden lg:inline">{viewAll.label}</span>
          <ArrowRightIcon className="h-4 w-4" />
        </FilterLink>
      )}
    </div>
  );
}

function EmptyState({
  href,
  filters,
  message,
  alternative,
}: {
  href: HrefFor;
  filters: HomeFilters;
  message: string;
  alternative?: { href: string; label: string };
}) {
  // The search elephant only while searching: the hero (and its elephant)
  // is hidden then, so the page never shows two.
  const searching = Boolean(filters.q);
  return (
    <div className="rounded-2xl border border-dashed border-hp-line bg-white px-6 py-10 text-center">
      {searching && (
        <Image
          src="/megadeal/mascot/megadeal-mascot-search.webp"
          alt=""
          width={400}
          height={331}
          sizes="120px"
          className="mx-auto mb-3 block h-auto w-[120px]"
        />
      )}
      <p className="text-hp-ink">{message}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold">
        {alternative && (
          <FilterLink href={alternative.href} className="text-hp-purple hover:underline">
            {alternative.label}
          </FilterLink>
        )}
        {hasNarrowingFilters(filters) && (
          <FilterLink
            href={href({ q: "", city: "", category: "", price: "", within: null })}
            className="text-hp-purple hover:underline"
          >
            Clear filters
          </FilterLink>
        )}
      </div>
    </div>
  );
}
