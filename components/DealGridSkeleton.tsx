export default function DealGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"
        >
          <div className="animate-shimmer aspect-[4/3] w-full" />
          <div className="space-y-2 p-4">
            <div className="animate-shimmer h-3 w-1/3 rounded" />
            <div className="animate-shimmer h-4 w-full rounded" />
            <div className="animate-shimmer h-4 w-2/3 rounded" />
            <div className="animate-shimmer h-5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
