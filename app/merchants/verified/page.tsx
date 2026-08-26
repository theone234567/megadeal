import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Email verification",
  robots: { index: false, follow: false },
};

export default function EmailVerifiedPage({
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
          <h1 className="mt-3 text-xl font-bold text-slate-900">Email verified!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Thanks — your contact email is confirmed. Sign in with this same
            email once your application&apos;s approved to manage your
            listing from the business portal.
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
            incorrectly. If you still need to verify your email,
            contact us and we&apos;ll help sort it out.
          </p>
        </>
      )}
      <Link
        href="/merchants"
        className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700"
      >
        Back to MegaDeal for business
      </Link>
    </main>
  );
}
