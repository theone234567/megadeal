export default function DealGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"
        >
          <div className="aspect-[4/3] w-full bg-slate-200" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-5 w-1/2 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
