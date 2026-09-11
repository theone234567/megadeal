import {
  UtensilsIcon,
  FlowerIcon,
  DumbbellIcon,
  CompassIcon,
  SuitcaseIcon,
  WrenchIcon,
} from "@/components/icons";
import { fredoka } from "@/lib/fonts";

/**
 * Icon-forward category tiles rather than photography — this environment
 * has no outbound access to source or verify real Unsplash/Pixabay/Pexels
 * images (see the redesign summary), so a broken hotlinked <img> would be
 * worse than a clean, restrained icon treatment. Swap in real photos later
 * by dropping files in public/images/categories/ and rendering a plain
 * next/image inside each tile instead of the icon.
 */
const CATEGORIES = [
  { icon: UtensilsIcon, label: "Food & Drink" },
  { icon: FlowerIcon, label: "Spas & Beauty" },
  { icon: DumbbellIcon, label: "Gyms & Fitness" },
  { icon: CompassIcon, label: "Things to Do" },
  { icon: SuitcaseIcon, label: "Getaways & Stays" },
  { icon: WrenchIcon, label: "Home & Auto Services" },
];

export default function DealCategories() {
  return (
    <section className="px-4 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-brand-900 sm:text-3xl`}>
            Deals across more of what you love
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            MegaDeal will feature offers across dining, wellness, fitness,
            experiences, getaways and everyday services.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
          {CATEGORIES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-6 text-center shadow-card"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-slate-800">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
