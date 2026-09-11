import ElephantMascot from "@/components/ElephantMascot";
import AucklandSkylineArt from "./AucklandSkylineArt";
import { fredoka } from "@/lib/fonts";

export default function ComingSoonHero() {
  return (
    <section className="px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center rounded-full bg-ember-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ember-600">
            Coming soon
          </span>
          <h1
            className={`${fredoka.className} mt-4 text-3xl font-bold leading-tight text-brand-900 sm:text-4xl lg:text-5xl`}
          >
            Auckland, get ready for better days out.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-slate-600 lg:mx-0 sm:text-lg">
            Local deals. Local businesses. Better value for Aucklanders.
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm font-semibold text-brand-700 lg:mx-0">
            MegaDeal is launching in Auckland first — with Wellington,
            Christchurch, Queenstown and Hamilton to follow.
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <AucklandSkylineArt className="h-full w-full rounded-full shadow-card" />
          {/* Small supporting brand element, not a hero-dominating mascot.
              ElephantMascot's own root element already hardcodes `relative`
              — passing `absolute` straight into its className would fight
              that (same CSS property, cascade order decides which wins),
              so this positions a wrapper instead and leaves the component
              itself untouched. */}
          <div className="absolute -bottom-2 -right-2">
            <ElephantMascot className="drop-shadow-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
