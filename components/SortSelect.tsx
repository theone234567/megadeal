import { SORT_OPTIONS, type SortOption } from "@/lib/sortDeals";

export default function SortSelect({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
      Sort by
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-400"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
