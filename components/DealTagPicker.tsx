"use client";

import { DEAL_TAGS, MAX_DEAL_TAGS, cleanDealTags } from "@/lib/dealTags";

/**
 * Tick up to five "good to know" tags from the fixed list (lib/dealTags.ts).
 * Real checkboxes, so they work with a keyboard and a screen reader; the
 * rest are disabled once five are ticked.
 */
export default function DealTagPicker({
  value,
  onChange,
  id = "deal-tags",
  legend = "Good to know (optional)",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  id?: string;
  legend?: string;
}) {
  const chosen = new Set(value);
  const full = chosen.size >= MAX_DEAL_TAGS;
  const toggle = (tag: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(tag);
    else next.delete(tag);
    onChange(cleanDealTags([...next]));
  };
  return (
    <fieldset aria-describedby={`${id}-hint`}>
      <legend className="mb-1 block font-display text-base font-bold text-slate-900">{legend}</legend>
      <p id={`${id}-hint`} className="text-xs text-slate-600">
        Pick up to {MAX_DEAL_TAGS} that are true for this deal. They help people find it, and we check them before it goes live.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DEAL_TAGS.map((t) => {
          const on = chosen.has(t.id);
          const disabled = !on && full;
          return (
            <label
              key={t.id}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-1 ${
                on
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : disabled
                    ? "cursor-not-allowed border-slate-200 text-slate-400"
                    : "border-slate-300 text-slate-700 hover:border-slate-400"
              }`}
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-brand-600"
                checked={on}
                disabled={disabled}
                onChange={(e) => toggle(t.id, e.target.checked)}
              />
              {t.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
