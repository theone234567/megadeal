import { HOME_SORT_OPTIONS, SORT_OPTIONS, type SortOption } from "@/lib/sortDeals";
import { BROWSE_CONTROL } from "./browseControls";
import { ChevronDownIcon } from "./icons";

const label = (v: SortOption) =>
  v === "nearest" ? "Nearest to me" : HOME_SORT_OPTIONS.find((o) => o.value === v)?.label ?? "Sort";

/**
 * The deal listings' sort control: reads "Sort: Ending soon" ("Sort" on a
 * phone), or "Sort: Recommended" on the homepage, until something else is
 * picked, then names it. A native select under a
 * styled face, so keyboard, screen readers and phone pickers all work
 * with no custom widget.
 */
export default function SortSelect({
  value,
  onChange,
  className = "",
  shortOnPhone = false,
  options = SORT_OPTIONS,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
  /** Reads just "Sort" on a phone whatever is picked (the purple outline
   *  shows it's changed): for a row of narrow buttons. */
  shortOnPhone?: boolean;
  /** The sorts offered; the first is the page's default. */
  options?: { value: SortOption; label: string }[];
}) {
  const isDefault = value === options[0].value;
  return (
    <label
      className={`${BROWSE_CONTROL} relative focus-within:ring-2 focus-within:ring-hp-purple focus-within:ring-offset-2 md:min-w-[7rem] ${
        !isDefault ? "border-hp-purple text-hp-purple" : "border-hp-line text-hp-ink hover:border-hp-boundary"
      } ${className}`}
    >
      <span aria-hidden className="truncate">
        {isDefault ? (
          <>
            Sort<span className="hidden md:inline">: {label(value)}</span>
          </>
        ) : shortOnPhone ? (
          <>
            <span className="md:hidden">Sort</span>
            <span className="hidden md:inline">{label(value)}</span>
          </>
        ) : (
          label(value)
        )}
      </span>
      <ChevronDownIcon className="h-4 w-4 shrink-0" />
      <select
        aria-label="Sort deals"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {label(o.value)}
          </option>
        ))}
      </select>
    </label>
  );
}
