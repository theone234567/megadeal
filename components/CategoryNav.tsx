import Link from "next/link";

const CATEGORIES = [
  { name: "Food & Drink", emoji: "🍽️" },
  { name: "Beauty & Spa", emoji: "💆" },
  { name: "Things To Do", emoji: "🎟️" },
  { name: "Travel & Getaways", emoji: "✈️" },
  { name: "Health & Fitness", emoji: "🏋️" },
];

export default function CategoryNav({ active }: { active?: string }) {
  return (
    <nav className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            !active
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All deals
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.name}
            href={`/category/${encodeURIComponent(c.name)}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === c.name
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="mr-1">{c.emoji}</span>
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export { CATEGORIES };
