"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Deal } from "@/lib/types";
import { useWithTestDeals } from "@/lib/useTestDeals";
import { useUserLocation, type Coords, type LocationStatus } from "@/lib/geo";
import { pushUrl, useUrlSearch } from "@/lib/useUrlSearch";
import { categoryBySlug } from "@/lib/categories";
import { DEFAULT_CITY } from "@/lib/cities";
import {
  DISTANCE_OPTIONS,
  NO_PANEL_FILTERS,
  PRICE_BANDS,
  filterByType,
  hasNarrowingFilters,
  homeHref,
  matchDeals,
  panelFilterChips,
  panelFilterCount,
  parseHomeFilters,
  type DealType,
  type HomeFilters,
  type PanelFilters,
} from "@/lib/homeFilters";
import CategoryNav from "@/components/CategoryNav";
import DealGrid from "@/components/DealGrid";
import DealRail from "@/components/DealRail";
import SortSelect from "@/components/SortSelect";
import ViewToggle from "@/components/ViewToggle";
import { BROWSE_CONTROL } from "@/components/browseControls";
import { ChevronDownIcon, CloseIcon, SlidersIcon } from "@/components/icons";

const DealsMap = dynamic(() => import("@/components/DealsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-hp-line bg-white text-sm text-hp-muted">
      Loading map…
    </div>
  ),
});

const TYPE_OPTIONS: { value: DealType; label: string }[] = [
  { value: "all", label: "All deals" },
  { value: "everyday", label: "Everyday" },
  { value: "flash", label: "Flash" },
];

/** Cards shown at first, and added by each "Show more deals": a whole
 *  number of rows at two, three and four across. */
const PAGE = 24;

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
 * The homepage's browsing area: a category strip, then one toolbar (deal
 * type; Filters, Sort and Grid/Map), a heading that says what's showing,
 * and one grid of results. Everything is driven by one set of filters in
 * the URL (lib/homeFilters.ts), so reload and back/forward restore it.
 * Deals arrive server-rendered from app/page.tsx; everything here filters
 * that list in the browser.
 */
export default function HomeDeals({
  initialDeals,
  initialSearch = "",
  basePath = "/",
  testDeals = false,
  prelaunch = false,
  dealsLive = false,
}: {
  initialDeals: Deal[];
  /** The public prelaunch homepage (lib/siteConfig.ts PRELAUNCH_HOME):
   *  real deals are "Available at launch" and don't link to their
   *  (still private) pages; the plain view is a "Launch deals" row rather
   *  than the grid; no map (its pins open the deal pages). */
  prelaunch?: boolean;
  /** Before launch with live deals (lib/siteConfig.ts DEALS_OPEN): the
   *  real deals are live, so their cards open their pages as usual and
   *  the map is back. */
  dealsLive?: boolean;
  /** Add the admin's test deals (pre-launch previews only). */
  testDeals?: boolean;
  /** The query string the server rendered with. */
  initialSearch?: string;
  basePath?: string;
}) {
  const searchParams = useUrlSearch(initialSearch);
  const parsed = parseHomeFilters(searchParams);
  const pagesPrivate = prelaunch && !dealsLive;
  const filters: HomeFilters = pagesPrivate ? { ...parsed, view: "grid" } : parsed;
  // Before launch, the plain homepage shows a row of launch deals; any
  // search, filter, category or "View all deals" shows the grid.
  const railView = prelaunch && searchParams.toString() === "";
  const [now, setNow] = useState(() => Date.now());
  const { coords, status: locationStatus, request: requestLocation } = useUserLocation();
  const needsLocation = filters.sort === "nearest" || filters.within !== null;
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  // Location is only asked for when the visitor picks "Nearest" or a
  // distance, never on page load. Reloading such a view measures again by
  // itself only when the browser already allows it (no prompt); otherwise
  // the note under the toolbar offers a button.
  useEffect(() => {
    if (!needsLocation || coords || locationStatus !== "idle" || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (!cancelled && p.state === "granted") requestLocation();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [needsLocation, coords, locationStatus, requestLocation]);

  // Re-check every 30s so a deal that expires while the page is open drops
  // out on its own.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const allDeals = useWithTestDeals(initialDeals, testDeals);
  const results = filterByType(matchDeals(allDeals, filters, now, coords), filters.type);
  // When a search or filter finds nothing, a few of what's live anyway,
  // so the page is never a dead end.
  const suggestions =
    results.length === 0 && hasNarrowingFilters(filters)
      ? matchDeals(allDeals, parseHomeFilters(new URLSearchParams()), now, coords)
          .filter((d) => d.inStock !== false)
          .slice(0, 4)
      : [];
  const countFor = (panel: PanelFilters) =>
    filterByType(matchDeals(allDeals, { ...filters, ...panel }, now, coords), filters.type).length;

  const href = (patch: Partial<HomeFilters>) => homeHref(filters, patch, basePath);
  const set = (patch: Partial<HomeFilters>) => {
    // Picking "Nearest" or a distance is the visitor asking to use their
    // location: the one moment the browser's prompt is expected.
    if (!coords && (patch.sort === "nearest" || patch.within)) requestLocation();
    navigate(href(patch));
  };

  return (
    <div id="deals" className="scroll-mt-[140px] lg:scroll-mt-24">
      {filters.q && <h1 className="sr-only">Search results for {filters.q}</h1>}

      <div className="mt-2 lg:mt-3">
        <CategoryNav mode="filter" filters={filters} basePath={basePath} onNavigate={navigate} homeLinks={prelaunch} />
      </div>

      <Toolbar
        href={href}
        filters={filters}
        set={set}
        countFor={countFor}
        hasLocation={coords !== null}
        locationStatus={locationStatus}
        filtersButtonRef={filtersButtonRef}
        showMap={!pagesPrivate}
      />

      {needsLocation && !coords && <LocationNote status={locationStatus} onRequest={requestLocation} />}

      <ActiveFilters
        filters={filters}
        onRemove={(patch) => {
          set(patch);
          // The chip just pressed is gone; keep keyboard focus nearby.
          filtersButtonRef.current?.focus();
        }}
      />

      {railView ? (
        <DealRail
          id="live-deals"
          className="mt-6 lg:mt-7"
          title={dealsLive ? "Live deals" : "Launch deals"}
          description={
            dealsLive
              ? "Real offers from Auckland businesses, on now. Get the code and contact the business directly."
              : "Real offers submitted by Auckland businesses for MegaDeal's launch. More are being added."
          }
          deals={results.slice(0, 12)}
          variant={dealsLive ? "default" : "launch"}
          viewAll={{
            href: `${basePath}?view=grid`,
            label: "View all deals",
            onClick: (e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              navigate(`${basePath}?view=grid`);
            },
          }}
          empty={
            <div className="mt-3 rounded-2xl border border-dashed border-hp-line bg-white px-6 py-8 text-center">
              <p className="font-semibold text-hp-ink">The first {dealsLive ? "live" : "launch"} deals are on their way.</p>
              <p className="mt-1 text-sm text-hp-muted">Auckland businesses are adding their offers now. Have one of your own?</p>
              <Link href="/list-your-business" className="btn-primary mt-4">
                Claim my free advertising
              </Link>
            </div>
          }
        />
      ) : (
        <ResultsHeading filters={filters} results={results} prelaunch={prelaunch} dealsLive={dealsLive} />
      )}

      {railView ? null : filters.view === "map" ? (
        <MapResults deals={results} coords={coords} />
      ) : (
        // Keyed on the filters so "Show more" starts over when they change.
        <Results
          key={searchParams.toString()}
          href={href}
          filters={filters}
          results={results}
          coords={coords}
          suggestions={suggestions}
          prelaunch={prelaunch}
          dealsLive={dealsLive}
        />
      )}
    </div>
  );
}

type HrefFor = (patch: Partial<HomeFilters>) => string;

/**
 * One row from a tablet up: the deal type on the left; Filters, Sort and
 * Grid/Map on the right (wrapping under it rather than overflowing when
 * there isn't room). On a phone: the deal type across the full width,
 * then Filters, Sort and Map in a row beneath.
 */
function Toolbar({
  href,
  filters,
  set,
  countFor,
  hasLocation,
  locationStatus,
  filtersButtonRef,
  showMap,
}: {
  href: HrefFor;
  filters: HomeFilters;
  set: (patch: Partial<HomeFilters>) => void;
  countFor: (panel: PanelFilters) => number;
  hasLocation: boolean;
  locationStatus: LocationStatus;
  filtersButtonRef: React.RefObject<HTMLButtonElement>;
  showMap: boolean;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:justify-between lg:mt-5">
      {/* Plain links with a current state rather than tabs: they filter
          the one list below instead of switching between panels. */}
      <div
        role="group"
        aria-label="Deal type"
        className="grid grid-cols-3 overflow-hidden rounded-xl border border-hp-line bg-hp-page md:inline-grid md:grid-cols-[repeat(3,auto)] lg:w-[22rem] lg:grid-cols-3"
      >
        {TYPE_OPTIONS.map((t, i) => {
          const selected = filters.type === t.value;
          return (
            <FilterLink
              key={t.value}
              href={href({ type: t.value })}
              aria-current={selected ? "true" : undefined}
              className={`flex h-11 items-center justify-center whitespace-nowrap px-3 text-sm md:px-4 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hp-purple ${
                i > 0 ? "border-l border-hp-line" : ""
              } ${selected ? "bg-hp-purple text-white" : "text-hp-ink hover:bg-hp-lavender"}`}
            >
              {t.label}
            </FilterLink>
          );
        })}
      </div>

      <div className={`grid gap-2 md:ml-auto md:flex md:items-center md:gap-2.5 ${showMap ? "grid-cols-3" : "grid-cols-2"}`}>
        <FilterPanel
          filters={filters}
          onApply={(panel) => set(panel)}
          countFor={countFor}
          hasLocation={hasLocation}
          locationStatus={locationStatus}
          openerRef={filtersButtonRef}
        />

        <SortSelect value={filters.sort} onChange={(sort) => set({ sort })} />
        {showMap && <ViewToggle value={filters.view} onChange={(view) => set({ view })} />}
      </div>
    </div>
  );
}

/**
 * Price and distance, in one panel: a sheet from the bottom on a phone, a
 * centred dialog on bigger screens. The native <dialog> keeps focus inside
 * while it's open, closes on Escape and hands focus back to the Filters
 * button. Changes are a draft until "Apply filters"; closing any other way
 * drops them. "Reset" clears the draft only — category, deal type, search
 * and sort aren't touched.
 */
function FilterPanel({
  filters,
  onApply,
  countFor,
  hasLocation,
  locationStatus,
  openerRef,
}: {
  filters: HomeFilters;
  onApply: (panel: PanelFilters) => void;
  countFor: (panel: PanelFilters) => number;
  hasLocation: boolean;
  locationStatus: LocationStatus;
  openerRef: React.RefObject<HTMLButtonElement>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<PanelFilters>(NO_PANEL_FILTERS);
  const applied = panelFilterCount(filters);

  // The page behind doesn't scroll while the panel is open.
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("overflow");
    },
    []
  );

  function open() {
    setDraft({ price: filters.price, within: filters.within });
    dialogRef.current?.showModal();
    document.documentElement.style.overflow = "hidden";
  }

  const close = () => dialogRef.current?.close();
  const matches = countFor(draft);
  const blocked = locationStatus === "denied" || locationStatus === "unsupported" || locationStatus === "error";

  const option = (name: string, checked: boolean, onChange: () => void, label: string) => (
    <label key={label} className="cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="flex min-h-[44px] items-center rounded-xl border border-hp-line px-3.5 text-sm font-semibold text-hp-ink transition hover:border-hp-boundary peer-checked:border-hp-purple peer-checked:bg-hp-lavender peer-checked:text-hp-purple peer-focus-visible:ring-2 peer-focus-visible:ring-hp-purple peer-focus-visible:ring-offset-2">
        {label}
      </span>
    </label>
  );

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className={`${BROWSE_CONTROL} ${applied ? "border-hp-purple text-hp-purple" : "border-hp-line text-hp-ink hover:border-hp-boundary"}`}
      >
        {/* With a count, a phone's narrow button drops the icon rather
            than cutting off the text. */}
        <SlidersIcon className={`h-[18px] w-[18px] shrink-0 ${applied ? "hidden min-[430px]:block" : ""}`} />
        <span className="truncate">Filters</span>
        {applied > 0 && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-hp-purple px-1.5 text-xs font-bold text-white">
            {applied}
            <span className="sr-only"> applied</span>
          </span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="filters-title"
        onClose={() => {
          document.documentElement.style.removeProperty("overflow");
          openerRef.current?.focus();
        }}
        onClick={(e) => {
          // A tap on the dimmed backdrop closes it, like the close button.
          if (e.target === dialogRef.current) close();
        }}
        className="m-0 mt-auto max-h-[calc(100dvh-1rem)] w-full max-w-none overflow-hidden rounded-t-3xl bg-white p-0 text-hp-ink shadow-xl backdrop:bg-hp-ink/40 open:flex open:flex-col sm:m-auto sm:max-h-[min(40rem,calc(100dvh-2rem))] sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-hp-line px-5 py-3">
          <h2 id="filters-title" className="font-display text-xl font-bold">
            Filters
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close filters"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrolls on a short screen or at a large text size. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <fieldset>
            <legend className="mb-2 text-[0.9375rem] font-bold">Price</legend>
            <div className="grid grid-cols-2 gap-2">
              {option("price", draft.price === "", () => setDraft({ ...draft, price: "" }), "Any price")}
              {PRICE_BANDS.map((b) =>
                option("price", draft.price === b.value, () => setDraft({ ...draft, price: b.value }), b.label)
              )}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 text-[0.9375rem] font-bold">Distance</legend>
            <div className="grid grid-cols-2 gap-2">
              {option("within", draft.within === null, () => setDraft({ ...draft, within: null }), "Any distance")}
              {DISTANCE_OPTIONS.map((km) =>
                option("within", draft.within === km, () => setDraft({ ...draft, within: km }), `Within ${km} km`)
              )}
            </div>
            {draft.within !== null && !hasLocation && (
              <p className="mt-2 text-sm text-hp-muted">
                {locationStatus === "denied"
                  ? "Location is blocked for this site in your browser, so distance can't be measured. Allow it in your browser's settings, then apply again."
                  : blocked
                  ? "Your browser couldn't share your location, so distance can't be measured right now."
                  : "Measured from where you are. Your browser will ask to share your location when you apply."}
              </p>
            )}
          </fieldset>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-hp-line px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => setDraft(NO_PANEL_FILTERS)}
            className="min-h-[44px] rounded-full px-3 text-sm font-semibold text-hp-purple underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              close();
            }}
            className="flex min-h-[48px] items-center justify-center rounded-full bg-hp-purple px-6 text-base font-bold text-white hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
          >
            Apply filters
            <span className="sr-only">, </span>
            {/* Without a location yet, distance isn't counted. */}
            <span className="ml-1.5 font-semibold text-white/85">
              ({matches}
              {draft.within !== null && !hasLocation ? "+" : ""} deal{matches === 1 ? "" : "s"})
            </span>
          </button>
        </div>
      </dialog>
    </>
  );
}

/** The panel's applied filters as chips, each removable on its own. */
function ActiveFilters({ filters, onRemove }: { filters: HomeFilters; onRemove: (patch: Partial<PanelFilters>) => void }) {
  const chips = panelFilterChips(filters);
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Filters applied" className="mt-3 flex flex-wrap items-center gap-x-2">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={() => onRemove(c.clear)}
            aria-label={`Remove filter: ${c.label}`}
            className="group flex min-h-[44px] items-center focus-visible:outline-none"
          >
            <span className="flex h-9 items-center gap-1.5 rounded-full border border-hp-purple/30 bg-hp-lavender pl-3 pr-2.5 text-sm font-semibold text-hp-purple group-hover:border-hp-purple group-focus-visible:ring-2 group-focus-visible:ring-hp-purple group-focus-visible:ring-offset-2">
              {c.label}
              <CloseIcon className="h-4 w-4" />
            </span>
          </button>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button
            type="button"
            onClick={() => onRemove(NO_PANEL_FILTERS)}
            className="min-h-[44px] px-1 text-sm font-semibold text-hp-purple underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
          >
            Clear filters
          </button>
        </li>
      )}
    </ul>
  );
}

function LocationNote({ status, onRequest }: { status: LocationStatus; onRequest: () => void }) {
  const button = (label: string) => (
    <button type="button" onClick={onRequest} className="font-semibold text-hp-purple underline underline-offset-2">
      {label}
    </button>
  );
  let text: React.ReactNode = null;
  if (status === "idle") text = <>Distance is measured from where you are. {button("Use my location")}</>;
  if (status === "loading") text = "Finding your location…";
  if (status === "denied")
    text = (
      <>
        Location access is blocked, so distance can&apos;t be measured. Allow location for this site in your browser,
        then {button("try again")}.
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

/**
 * What's showing, in a line: "Auckland deals", "Food & Drink deals",
 * "Results for “pizza”", with the count beneath. Test deals (an admin's
 * pre-launch previews) are called out here as well as on each card.
 */
function ResultsHeading({
  filters,
  results,
  prelaunch = false,
  dealsLive = false,
}: {
  filters: HomeFilters;
  results: Deal[];
  prelaunch?: boolean;
  dealsLive?: boolean;
}) {
  const categoryName = filters.category ? categoryBySlug(filters.category)?.name : null;
  const place = filters.city || DEFAULT_CITY.name;
  const title = filters.q
    ? `Results for “${filters.q}”`
    : categoryName
    ? `${categoryName} deals${filters.city ? ` in ${filters.city}` : ""}`
    : prelaunch
    ? dealsLive
      ? "Live deals"
      : "Launch deals"
    : `${place} deals`;

  const n = results.length;
  const kind = filters.type === "flash" ? "Flash Deal" : filters.type === "everyday" ? "Everyday Deal" : "deal";
  const scope = filters.q ? [categoryName ? `in ${categoryName}` : "", filters.city ? `in ${filters.city}` : ""].filter(Boolean).join(" ") : "";
  const tests = results.filter((d) => d.isTest).length;
  const preview =
    tests === 0 ? "" : tests === n ? "Test deals · Preview only" : `Includes ${tests} test deal${tests === 1 ? "" : "s"} · Preview only`;

  return (
    <div className="mb-3 mt-5 lg:mb-4 lg:mt-6">
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight text-hp-ink lg:text-[1.75rem]">{title}</h2>
      <p role="status" className="mt-0.5 text-sm text-hp-muted">
        {n} {kind}
        {n === 1 ? "" : "s"}
        {scope ? ` ${scope}` : ""}
        {preview ? ` · ${preview}` : ""}
      </p>
    </div>
  );
}

function MapResults({ deals, coords }: { deals: Deal[]; coords: Coords | null }) {
  const unpinned = deals.filter((d) => d.businessLat === null || d.businessLng === null).length;
  return (
    <div>
      <DealsMap deals={deals} userLocation={coords} />
      {unpinned > 0 && deals.length > unpinned && (
        <p className="mt-2 text-sm text-hp-muted">
          {unpinned} of these deals {unpinned === 1 ? "isn't" : "aren't"} on the map: no map location, or the business
          keeps its address private. They&apos;re all in the list view.
        </p>
      )}
    </div>
  );
}

function Results({
  href,
  filters,
  results,
  coords,
  suggestions,
  prelaunch,
  dealsLive,
}: {
  href: HrefFor;
  filters: HomeFilters;
  results: Deal[];
  coords: Coords | null;
  suggestions: Deal[];
  prelaunch: boolean;
  dealsLive: boolean;
}) {
  const [limit, setLimit] = useState(PAGE);
  // Only on the plain homepage view, not in the middle of a search. The
  // prelaunch homepage has its own business strip below.
  const inviteBusinesses = !prelaunch && filters.type === "all" && !hasNarrowingFilters(filters);
  const variant = prelaunch && !dealsLive ? "launch" : "default";

  if (results.length === 0) {
    const narrowed = hasNarrowingFilters(filters);
    const typeName = filters.type === "flash" ? "Flash Deals" : "Everyday Deals";
    return (
      <>
        <EmptyState
          href={href}
          filters={filters}
          message={
            filters.q
              ? `No deals match “${filters.q}” right now. Try a shorter or different word.`
              : narrowed
              ? "No deals match these filters right now."
              : filters.type === "flash"
              ? "No Flash Deals right now. They run for up to 6 hours, so check back soon."
              : filters.type === "everyday"
              ? "No Everyday Deals right now."
              : "New local deals are on the way — check back soon."
          }
          alternative={filters.type !== "all" ? { href: href({ type: "all" }), label: `All deals, not just ${typeName}` } : undefined}
        />
        {suggestions.length > 0 && (
          <section aria-labelledby="suggestions-heading" className="mt-8">
            <h2 id="suggestions-heading" className="mb-4 font-display text-lg font-bold text-hp-ink">
              {prelaunch && !dealsLive ? "Other launch deals" : "Other deals on now"}
            </h2>
            <DealGrid deals={suggestions} userLocation={coords} variant={variant} />
          </section>
        )}
        {inviteBusinesses && <BusinessInvite />}
      </>
    );
  }

  return (
    <>
      <DealGrid deals={results.slice(0, limit)} userLocation={coords} priorityCount={prelaunch ? 0 : 2} variant={variant} />
      {results.length > limit && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((n) => n + PAGE)}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-hp-purple bg-white px-6 text-[0.9375rem] font-semibold text-hp-purple hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 sm:w-auto"
          >
            Show more deals
            <span className="font-normal text-hp-muted">({results.length - limit} more)</span>
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      {inviteBusinesses && <BusinessInvite />}
    </>
  );
}

/**
 * The one business invitation on the homepage: a quiet panel under the
 * deals, not a second hero. "Business sign in" stays in the header; it's
 * repeated here as a text link for a business owner who scrolled straight
 * to this panel.
 */
function BusinessInvite() {
  return (
    <aside
      aria-labelledby="business-invite-heading"
      className="mt-8 flex flex-col gap-4 rounded-2xl border border-hp-line bg-hp-lavender px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:mt-10"
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
          prefetch={false}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-hp-purple underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
        >
          Business sign in
        </Link>
      </div>
    </aside>
  );
}

/** Nothing to show: says why, and offers each way back to some deals —
 *  never quietly widening the search on the visitor's behalf. */
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
  const ways = [
    alternative,
    filters.q ? { href: href({ q: "" }), label: "Clear search" } : undefined,
    panelFilterCount(filters) ? { href: href(NO_PANEL_FILTERS), label: "Clear filters" } : undefined,
    filters.category ? { href: href({ category: "" }), label: "All categories" } : undefined,
    filters.city ? { href: href({ city: "" }), label: "All areas" } : undefined,
  ].filter((w): w is { href: string; label: string } => Boolean(w));
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
      {ways.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold">
          {ways.map((w) => (
            <FilterLink key={w.label} href={w.href} className="inline-flex min-h-[44px] items-center text-hp-purple hover:underline">
              {w.label}
            </FilterLink>
          ))}
        </div>
      )}
    </div>
  );
}
