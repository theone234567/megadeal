import { BROWSE_CONTROL } from "./browseControls";
import { GridIcon, MapPinIcon } from "./icons";

export type DealsView = "grid" | "map";

/**
 * Cards or map. From a tablet up, both choices side by side with the
 * current one filled; on a phone, one button to the other view ("Map",
 * then "List" to come back), saving the room.
 */
export default function ViewToggle({ value, onChange }: { value: DealsView; onChange: (value: DealsView) => void }) {
  return (
    <>
      <div role="group" aria-label="Show deals as" className="hidden shrink-0 overflow-hidden rounded-xl border border-hp-line bg-white md:flex">
        {(["grid", "map"] as const).map((v, i) => {
          const Icon = v === "grid" ? GridIcon : MapPinIcon;
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={selected}
              className={`flex h-11 items-center gap-1.5 px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hp-purple ${
                i > 0 ? "border-l border-hp-line" : ""
              } ${selected ? "bg-hp-purple text-white" : "text-hp-ink hover:bg-hp-lavender"}`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {v === "grid" ? "Grid" : "Map"}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(value === "map" ? "grid" : "map")}
        className={`${BROWSE_CONTROL} border-hp-line text-hp-ink hover:border-hp-boundary md:hidden`}
      >
        {value === "map" ? <GridIcon className="h-[18px] w-[18px] shrink-0" /> : <MapPinIcon className="h-[18px] w-[18px] shrink-0" />}
        {value === "map" ? "List" : "Map"}
      </button>
    </>
  );
}
