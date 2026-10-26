import type { ReactNode } from "react";
import Link from "next/link";

/**
 * The top of an information page (About, Help, How it works…): a deep
 * brand-purple band with a soft glow, a breadcrumb back to the home page,
 * the page's <h1> and a short lead. One component so every such page
 * looks like part of the same established site rather than each drawing
 * its own flat purple block (owner, 27 Oct 2026: "not small business
 * built").
 */
export default function PageHero({ crumb, title, children }: { crumb: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="bg-brand-deep relative isolate overflow-hidden px-4 text-center sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      <div className="mx-auto max-w-3xl py-14 sm:py-20">
        <nav aria-label="Breadcrumb" className="text-sm font-medium text-white/80">
          <ol className="inline-flex items-center gap-2">
            <li>
              <Link href="/" className="rounded transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-white">
              {crumb}
            </li>
          </ol>
        </nav>
        <h1 className="font-display mt-4 text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-[3.5rem]">{title}</h1>
        {children && <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl">{children}</p>}
      </div>
    </section>
  );
}
