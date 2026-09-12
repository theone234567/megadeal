const ROLLOUT = [
  { city: "Auckland", status: "Launching first", active: true },
  { city: "Wellington", status: "Coming next", active: false },
  { city: "Christchurch", status: "Coming soon", active: false },
  { city: "Queenstown", status: "Coming soon", active: false },
  { city: "Hamilton", status: "Coming soon", active: false },
];

export default function LaunchRoadmap() {
  return (
    <section className="px-6 pt-8 lg:px-10">
      <div className="mx-auto max-w-[1360px] rounded-2xl border border-slate-100 bg-white px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-between">
          <p className="text-sm font-bold text-slate-900">Launching across New Zealand</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {ROLLOUT.map(({ city, status, active }) => (
              <div key={city} className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-ember-500" : "bg-slate-300"}`}
                />
                <span className={`text-xs font-semibold ${active ? "text-ember-600" : "text-slate-500"}`}>
                  {city}
                </span>
                <span className="text-xs text-slate-400">· {status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
