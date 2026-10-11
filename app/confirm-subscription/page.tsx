import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirm your deal alerts",
  robots: { index: false, follow: false },
};

/**
 * Where a deal-alert confirmation link lands (app/api/email-signup/
 * verify): one button, so it's a person who confirms, not a mail scanner
 * opening every link in the email.
 */
export default function ConfirmSubscriptionPage() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-bold text-slate-900">Confirm your MegaDeal emails</h1>
      <p className="mt-2 text-sm text-slate-500">
        Press the button to start getting deal emails. You can unsubscribe any time.
      </p>
      <form method="post" action="/api/email-signup/verify" className="mt-6">
        <button
          type="submit"
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          Confirm my subscription
        </button>
      </form>
    </main>
  );
}
