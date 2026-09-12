import { LeafIcon, HeartIcon, UsersIcon, MapPinIcon } from "@/components/icons";

const BENEFITS = [
  { icon: LeafIcon, text: "No vouchers to buy" },
  { icon: HeartIcon, text: "Support local businesses" },
  { icon: UsersIcon, text: "Customers deal directly with businesses" },
  { icon: MapPinIcon, text: "Launching in Auckland first" },
];

export default function BenefitsRow() {
  return (
    <section className="px-6 pt-8 lg:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:justify-between">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="text-sm font-semibold text-slate-700">{text}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          Wellington, Christchurch, Queenstown and Hamilton to follow.
        </p>
      </div>
    </section>
  );
}
