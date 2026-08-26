import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Email confirmed",
  robots: { index: false, follow: false },
};

export default function SubscribedPage({
  searchParams,
}: {
  searchParams: { ok?: string };
}) {
  const ok = searchParams.ok === "1";

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {ok ? (
        <>
          <span className="text-4xl">✅</span>
          <h1 className="mt-3 text-xl font-bold text-slate-900">You&apos;re confirmed!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your email is verified — you&apos;ll start getting MegaDeal
            alerts. You can unsubscribe anytime using the link in any email.
          </p>
        </>
      ) : (
        <>
          <span className="text-4xl">⚠️</span>
          <h1 className="mt-3 text-xl font-bold text-slate-900">
            That link isn&apos;t valid
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            It may have already been used, or the link was copied
            incorrectly. Sign up again below if you still want deal alerts.
          </p>
        </>
      )}
      <Link
        href="/"
        className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700"
      >
        Back to MegaDeal
      </Link>
    </main>
  );
}
