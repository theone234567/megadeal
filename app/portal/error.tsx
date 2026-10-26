"use client";

import { useEffect } from "react";
import Link from "next/link";

/** A business portal page that failed (T257): back to the portal, not to
 *  the deals, which is where a business was trying to get to. */
export default function PortalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <meta name="robots" content="noindex" />
      <span className="text-4xl">🐘</span>
      <h1 className="mt-3 text-xl font-bold text-slate-900">Something went sideways</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your portal hit a snag loading. Nothing you saved is lost. Give it another go.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => retry()}
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700"
        >
          Try again
        </button>
        <Link href="/portal" className="text-sm font-semibold text-brand-600 hover:underline">
          Back to your portal
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Keeps happening?{" "}
        <Link href="/contact" className="underline hover:text-slate-500">
          Let us know
        </Link>
        .
      </p>
    </main>
  );
}
