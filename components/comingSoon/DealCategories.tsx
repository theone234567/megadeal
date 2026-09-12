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
 * Edge-to-edge illustrated tiles rather than photography — this
 * environment has no outbound access to source or verify real
 * Unsplash/Pixabay/Pexels images (the proxy explicitly denies those
 * hosts; see the redesign summary), so a broken hotlinked <img> would be
 * worse than a clean illustrated placeholder. Swap in real photos later
 * by dropping files in public/images/categories/ and rendering a plain
 * next/image inside each tile instead of the gradient+icon.
 */
const CATEGORIES = [
  { icon: UtensilsIcon, label: "Food & Drink", from: "#ffb37a", to: "#ff7a59" },
  { icon: FlowerIcon, label: "Spas & Beauty", from: "#ffb8e8", to: "#c194ff" },
  { icon: DumbbellIcon, label: "Gyms & Fitness", from: "#7ad9ff", to: "#7a17f0" },
  { icon: CompassIcon, label: "Things to Do", from: "#a3ffcf", to: "#2fb8a0" },
  { icon: SuitcaseIcon, label: "Getaways & Stays", from: "#ffd98a", to: "#e81ea3" },
  { icon: WrenchIcon, label: "Home & Auto", from: "#c3c8ff", to: "#650fc7" },
];

export default function DealCategories() {
  return (
    <section className="px-6 pt-10 lg:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-brand-900 sm:text-3xl`}>
            Deals across more of what you love
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            MegaDeal will feature offers across dining, wellness, fitness,
            experiences, getaways and everyday services.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map(({ icon: Icon, label, from, to }) => (
            <div key={label}>
              <div
                className="flex aspect-[4/3] items-center justify-center rounded-xl"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
              >
                <Icon className="h-9 w-9 text-white" />
              </div>
              <p className="mt-2 text-center text-sm font-semibold text-slate-800">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
