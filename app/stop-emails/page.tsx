import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unsubscribe from business emails",
  robots: { index: false, follow: false },
};

/**
 * Where the unsubscribe link in a business announcement or "finish your
 * listing" reminder lands (lib/businessEmailOptOut.ts): one button, so
 * it's a person who unsubscribes, not a mail scanner opening every link.
 */
export default async function StopEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; s?: string; done?: string }>;
}) {
  const { m, s, done } = await searchParams;
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {done === "1" ? (
        <>
          <h1 className="text-xl font-bold text-slate-900">You&apos;re unsubscribed</h1>
          <p className="mt-2 text-sm text-slate-500">
            We won&apos;t send you MegaDeal news, tips or reminders. Emails about your account and your deals (like
            approvals and sign-in links) still come, because you need them.
          </p>
          <Link href="/portal" className="mt-6 text-sm font-bold text-brand-700 underline underline-offset-2">
            Go to your business portal
          </Link>
        </>
      ) : done === "0" || !m || !s ? (
        <>
          <h1 className="text-xl font-bold text-slate-900">We couldn&apos;t unsubscribe you</h1>
          <p className="mt-2 text-sm text-slate-500">
            The link may have been copied incorrectly. Open the unsubscribe link in the email again, or reply to the
            email and we&apos;ll do it for you.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold text-slate-900">Unsubscribe from MegaDeal business emails?</h1>
          <p className="mt-2 text-sm text-slate-500">
            No more news, tips or reminders. Emails about your account and your deals still come.
          </p>
          <form method="post" action="/api/business-emails/stop" className="mt-6">
            <input type="hidden" name="m" value={m} />
            <input type="hidden" name="s" value={s} />
            <button
              type="submit"
              className="rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              Unsubscribe
            </button>
          </form>
        </>
      )}
    </main>
  );
}
