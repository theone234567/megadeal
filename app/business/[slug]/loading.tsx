export default function BusinessProfileLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-shimmer h-4 w-28 rounded" />

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-5">
          <div className="animate-shimmer h-20 w-20 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="animate-shimmer h-6 w-1/2 rounded" />
            <div className="animate-shimmer h-4 w-1/3 rounded" />
          </div>
        </div>
        <div className="animate-shimmer mt-5 h-4 w-full max-w-md rounded" />
        <div className="animate-shimmer mt-2 h-4 w-2/3 max-w-sm rounded" />
      </div>

      <div className="animate-shimmer mb-5 mt-8 h-6 w-1/3 rounded" />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
            <div className="animate-shimmer aspect-[4/3] w-full" />
            <div className="space-y-2 p-4">
              <div className="animate-shimmer h-3 w-1/3 rounded" />
              <div className="animate-shimmer h-4 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
