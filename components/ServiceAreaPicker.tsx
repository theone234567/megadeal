"use client";

import { ALL_OF_AUCKLAND, AUCKLAND_AREAS, areasText, tickedAreas } from "@/lib/location";

/**
 * "Areas you cover", for a business that goes to its customers. In
 * Auckland, tick boxes for its main areas (the same words on every
 * listing, and no typos); elsewhere, or for text typed before these
 * existed, a box to type in. Saved as plain text either way.
 */
export default function ServiceAreaPicker({
  id,
  value,
  onChange,
  city,
  label,
  labelClass,
  inputClass,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** The business's city: the tick boxes are Auckland's areas. */
  city: string;
  label: string;
  labelClass: string;
  inputClass: string;
}) {
  const ticked = tickedAreas(value);
  const auckland = city === "" || city.toLowerCase() === "auckland";

  if (!auckland || ticked === null) {
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <input
          id={id}
          maxLength={200}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Hamilton and Cambridge"
          className={inputClass}
        />
        {auckland && (
          <button type="button" onClick={() => onChange("")} className="mt-1 text-xs font-semibold text-brand-700 underline">
            Pick from Auckland&apos;s areas instead
          </button>
        )}
      </div>
    );
  }

  const all = ticked.length === AUCKLAND_AREAS.length;
  const chip = (on: boolean) =>
    `flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition focus-within:ring-2 focus-within:ring-brand-400 ${
      on ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
    }`;
  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        <label className={chip(all)}>
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => onChange(e.target.checked ? ALL_OF_AUCKLAND : "")}
            className="h-3.5 w-3.5 accent-brand-600"
          />
          {ALL_OF_AUCKLAND}
        </label>
        {AUCKLAND_AREAS.map((area) => {
          const on = ticked.includes(area);
          return (
            <label key={area} className={chip(on)}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => onChange(areasText(e.target.checked ? [...ticked, area] : ticked.filter((a) => a !== area)))}
                className="h-3.5 w-3.5 accent-brand-600"
              />
              {area}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
