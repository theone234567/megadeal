import { SORT_OPTIONS, type SortOption } from "@/lib/sortDeals";
import { BROWSE_CONTROL } from "./browseControls";
import { ChevronDownIcon } from "./icons";

const label = (v: SortOption) =>
  v === "nearest" ? "Nearest to me" : SORT_OPTIONS.find((o) => o.value === v)?.label ?? "Sort";

/**
 * The deal listings' sort control: reads "Sort" until something other
 * than the default is picked, then names it. A native select under a
 * styled face, so keyboard, screen readers and phone pickers all work
 * with no custom widget.
 */
export default function SortSelect({
  value,
  onChange,
  className = "",
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}) {
  return (
    <label
      className={`${BROWSE_CONTROL} relative focus-within:ring-2 focus-within:ring-hp-purple focus-within:ring-offset-2 md:min-w-[7rem] ${
        value !== "ending" ? "border-hp-purple text-hp-purple" : "border-hp-line text-hp-ink hover:border-hp-boundary"
      } ${className}`}
    >
      <span aria-hidden className="truncate">
        {value === "ending" ? "Sort" : label(value)}
      </span>
      <ChevronDownIcon className="h-4 w-4 shrink-0" />
      <select
        aria-label="Sort deals"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {label(o.value)}
          </option>
        ))}
      </select>
    </label>
  );
}
