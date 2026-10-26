import PageHero from "./PageHero";

/**
 * Shell for the site's text pages (terms, privacy, refund policy…): the
 * same banner as every other information page (components/PageHero.tsx),
 * then the document on white, with headings in the site's display face
 * and scale via the `font-display` utility (tailwind.config.ts) rather
 * than a font object — a next/font className can't be interpolated into a
 * Tailwind arbitrary variant like [&_h2]:… because Tailwind has to see the
 * class at build time.
 */
export default function PageShell({
  title,
  subtitle,
  crumb = "Legal",
  children,
}: {
  title: string;
  subtitle?: string;
  crumb?: string;
  children: React.ReactNode;
}) {
  return (
    <main>
      <PageHero crumb={crumb} title={title}>
        {subtitle}
      </PageHero>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="prose-content space-y-5 text-lg text-slate-600 [&_h2]:!mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:!mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed sm:[&_h2]:text-3xl">
          {children}
        </div>
      </div>
    </main>
  );
}
