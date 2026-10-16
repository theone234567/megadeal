/**
 * Shown the moment a deal is clicked, while the server reads it from Wix.
 * Without it the old page just sat there until the whole deal page was
 * ready, which read as the click not working. It also lets Next prefetch
 * this shell for every deal card in view (a dynamic route is only
 * prefetched up to its loading boundary), so it appears instantly.
 *
 * Same layout as DealDetail — breadcrumb, title, business, then the photo
 * beside the price panel — so the page doesn't jump when the deal arrives.
 *
 * The trade-off, as on /business/[slug]: the response starts before the
 * deal is read, so a deal that's gone (expired, paused, withdrawn) is
 * answered 200 with a noindex tag rather than a 404, for bots too
 * (checked with Googlebot and Bingbot user agents). Search engines drop a
 * noindex page just the same, and nothing here reads the status code.
 */
export default function DealLoading() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7" aria-busy="true">
      <span className="sr-only">Loading deal…</span>
      <div aria-hidden>
        <div className="animate-shimmer h-4 w-40 rounded" />

        <div className="mt-4">
          <div className="animate-shimmer h-3 w-24 rounded" />
          <div className="animate-shimmer mt-3 h-8 w-4/5 max-w-xl rounded-lg lg:h-10" />
          <div className="animate-shimmer mt-3 h-4 w-48 rounded" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)] lg:items-start lg:gap-6">
          <div className="animate-shimmer aspect-video w-full rounded-2xl" />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="animate-shimmer h-12 w-36 rounded-lg" />
            <div className="animate-shimmer mt-3 h-4 w-40 rounded" />
            <div className="animate-shimmer mt-2 h-3 w-48 rounded" />
            <div className="animate-shimmer mt-4 h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
