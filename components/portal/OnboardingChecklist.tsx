interface OnboardingChecklistProps {
  emailVerified?: boolean;
  profileComplete: boolean;
  hasDeals: boolean;
}

/**
 * Shown to a merchant until every step is done, then disappears — no need
 * to keep nagging once they're fully set up.
 */
export default function OnboardingChecklist({
  emailVerified,
  profileComplete,
  hasDeals,
}: OnboardingChecklistProps) {
  const steps = [
    { label: "Verify your email", done: Boolean(emailVerified) },
    { label: "Complete your business profile", done: profileComplete },
    { label: "Create your first deal", done: hasDeals },
  ];
  if (steps.every((s) => s.done)) return null;

  return (
    <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-6">
      <h2 className="text-lg font-bold text-brand-900">Get set up</h2>
      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span aria-hidden className={s.done ? "text-green-600" : "text-slate-400"}>
              {s.done ? "✓" : "○"}
            </span>
            <span className={s.done ? "text-slate-500 line-through" : "font-medium text-slate-700"}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
