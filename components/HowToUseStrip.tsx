import Link from "next/link";

const STEPS = [
  { emoji: "🔍", title: "1. Browse", text: "Find a deal near you" },
  { emoji: "🎟️", title: "2. Get the code", text: "Tap \"Get this deal\" for contact details + your code" },
  { emoji: "📞", title: "3. Contact & redeem", text: "Call, message or visit — quote the code, pay direct" },
];

/**
 * Compact reminder of how MegaDeal works, dropped onto browse-heavy pages
 * (home, category, flash deals, business profile) so the "no vouchers,
 * contact the business directly" model stays visible wherever someone
 * might land first — not just on the dedicated /how-it-works page.
 *
 * `bare` skips the component's own max-width/padding wrapper for use
 * inside a page section that already applies one, avoiding doubled-up
 * padding.
 */
export default function HowToUseStrip({ bare = false }: { bare?: boolean }) {
  const content = (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        {STEPS.map((s) => (
          <div key={s.title} className="flex items-start gap-2 sm:items-center">
            <span className="text-lg leading-none">{s.emoji}</span>
            <p className="text-xs text-slate-600 sm:text-sm">
              <span className="font-bold text-slate-800">{s.title}</span>{" "}
              <span className="text-slate-500">— {s.text}</span>
            </p>
          </div>
        ))}
      </div>
      <Link
        href="/how-it-works"
        className="shrink-0 text-xs font-semibold text-brand-600 hover:underline sm:text-sm"
      >
        Full guide →
      </Link>
    </div>
  );

  if (bare) return content;

  return <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{content}</div>;
}
