"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  /** Fetches the page again and re-renders it (T257). The old reset()
   *  only re-rendered what had already failed, so a server error came
   *  straight back. */
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {/* A page that fails after it has started streaming can't change its
          200 status, so search engines are told not to index this one in
          its place (React puts the tag in <head>). */}
      <meta name="robots" content="noindex" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/minimal/megadeal-elephant-minimal-purple.svg" alt="" width={72} height={51} fetchPriority="low" className="h-auto w-[72px]" />
      <h1 className="font-display mt-4 text-2xl font-bold text-slate-900">
        Something went sideways
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        That&apos;s on us, not you — the page hit a snag loading. Give it
        another go, or head back to the deals.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => retry()}
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
