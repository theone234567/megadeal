"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="text-4xl">🐘</span>
      <h1 className="mt-3 text-xl font-bold text-slate-900">
        Something went sideways
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        That&apos;s on us, not you — the page hit a snag loading. Give it
        another go, or head back to the deals.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-sm font-semibold text-brand-600 hover:underline"
        >
          Back to all deals
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-400">
        Keeps happening?{" "}
        <Link href="/contact" className="underline hover:text-slate-500">
          Let us know
        </Link>
        .
      </p>
    </main>
  );
}
