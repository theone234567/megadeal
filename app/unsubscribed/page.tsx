import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: false },
};

export default async function UnsubscribedPage(
  props: {
    searchParams: Promise<{ ok?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const ok = searchParams.ok === "1";

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {ok ? (
        <>
          <span className="text-4xl">👋</span>
          <h1 className="mt-3 text-xl font-bold text-slate-900">You&apos;re unsubscribed</h1>
          <p className="mt-2 text-sm text-slate-500">
            You won&apos;t receive any more MegaDeal deal emails. You can
            always sign up again later from the homepage.
          </p>
        </>
      ) : (
        <>
          <span className="text-4xl">⚠️</span>
          <h1 className="mt-3 text-xl font-bold text-slate-900">
            We couldn&apos;t unsubscribe you
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            The link may have been copied incorrectly, or something went wrong on our side. Open the
            unsubscribe link in the email again, or contact us and we&apos;ll stop the emails.
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
