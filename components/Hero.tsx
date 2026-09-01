export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-ember-500">
      <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-ember-300/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-100">
          Today&apos;s hottest local deals
        </p>
        <h1 className="max-w-2xl font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">
          Up to 70% off restaurants, spas, activities &amp; getaways near you
        </h1>
        <p className="mt-4 max-w-xl text-brand-50">
          New deals added daily. No vouchers, no checkout — pick a deal,
          contact the business, and pay them directly at the discounted
          price.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-brand-50">
          <span>🎟️ No vouchers to buy</span>
          <span>📞 Deal with the business direct</span>
          <span>💸 Never a MegaDeal fee</span>
        </div>
      </div>
    </section>
  );
}
