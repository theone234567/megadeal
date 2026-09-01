export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-100 sm:text-sm">
          Today&apos;s hottest local deals
        </p>
        <h1 className="max-w-2xl text-xl font-extrabold leading-tight text-white sm:text-2xl lg:text-3xl">
          Up to 70% off restaurants, spas, activities &amp; getaways near you
        </h1>
        <p className="mt-2.5 max-w-xl text-sm text-brand-50 sm:text-base">
          No vouchers, no checkout — pick a deal, contact the business, and
          pay them directly at the discounted price.
        </p>
      </div>
    </section>
  );
}
