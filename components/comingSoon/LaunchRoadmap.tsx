import { fredoka } from "@/lib/fonts";

const ROLLOUT = [
  { city: "Auckland", status: "Launching first", active: true },
  { city: "Wellington", status: "Coming next", active: false },
  { city: "Christchurch", status: "Coming soon", active: false },
  { city: "Queenstown", status: "Coming soon", active: false },
  { city: "Hamilton", status: "Coming soon", active: false },
];

export default function LaunchRoadmap() {
  return (
    <section className="px-4 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className={`${fredoka.className} text-center text-2xl font-bold text-brand-900 sm:text-3xl`}>
          Launching across New Zealand
        </h2>
        <ol className="mt-8 space-y-0">
          {ROLLOUT.map(({ city, status, active }, i) => (
            <li key={city} className="relative flex gap-4 pb-8 last:pb-0">
              {i < ROLLOUT.length - 1 && (
                <span
                  aria-hidden
                  // bottom-0 (not h-full) so the browser computes the
                  // height from the <li>'s own content + padding, which
                  // h-full can't do reliably on an absolutely positioned
                  // element without an explicit-height ancestor.
                  className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-200"
                />
              )}
              <span
                className={`relative mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  active ? "bg-ember-500" : "bg-slate-300"
                }`}
              >
                {active && (
                  <span className="absolute h-4 w-4 animate-ping rounded-full bg-ember-500 opacity-50" />
                )}
              </span>
              <div>
                <p className="font-bold text-slate-900">{city}</p>
                <p className={`text-sm ${active ? "font-semibold text-ember-600" : "text-slate-500"}`}>
                  {status}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
