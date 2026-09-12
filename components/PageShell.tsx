/**
 * Shell for the site's text pages (terms, privacy, refund policy, careers…).
 *
 * Its headings used to opt out of the site's type system entirely: the h1
 * was the body sans at text-3xl, and h2 was text-lg — 18px, smaller than
 * a section heading anywhere else and in a different typeface. Against
 * /about or /list-your-business, whose h1/h2 are Fredoka at
 * text-3xl→5xl / text-2xl→3xl, the legal pages read as a different site.
 * These now follow the same scale and the same display face, via the
 * `font-display` utility (wired to the Fredoka variable in
 * tailwind.config.ts) rather than importing the font object — a
 * next/font className can't be interpolated into a Tailwind arbitrary
 * variant like [&_h2]:… because Tailwind has to see the class at build
 * time.
 */
export default function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
      <div className="prose-content mt-8 space-y-5 text-lg text-slate-600 [&_h2]:!mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:!mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed sm:[&_h2]:text-3xl">
        {children}
      </div>
    </main>
  );
}
