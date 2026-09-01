import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="text-4xl">🐘</span>
      <h1 className="mt-3 text-xl font-bold text-slate-900">
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
