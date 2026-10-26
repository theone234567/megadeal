import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  // The same "noindex" Next.js adds to every not-found page itself (it
  // overrides the layout's "index, follow"), so the two tags agree.
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/minimal/megadeal-elephant-minimal-purple.svg" alt="" width={72} height={51} className="h-auto w-[72px]" />
      <h1 className="font-display mt-4 text-2xl font-bold text-slate-900">
        This page has wandered off
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Whatever you were looking for isn&apos;t here — maybe the deal
        expired, or the link&apos;s just wrong. Let&apos;s get you back to
        the good stuff.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700"
        >
          Back to all deals
        </Link>
        <Link
          href="/contact"
          className="text-sm font-semibold text-brand-600 hover:underline"
        >
          Something broken? Let us know
        </Link>
      </div>
    </main>
  );
}
