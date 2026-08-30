export type DealsView = "grid" | "map";

export default function ViewToggle({
  value,
  onChange,
}: {
  value: DealsView;
  onChange: (value: DealsView) => void;
}) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-full border border-slate-200">
      {(["grid", "map"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`px-3 py-1.5 text-sm font-semibold transition ${
            value === v ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {v === "grid" ? "Grid" : "🗺️ Map"}
        </button>
      ))}
    </div>
  );
}
