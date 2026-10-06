import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/**
 * Where an email's unsubscribe link lands (app/api/email-signup/
 * unsubscribe): one button, so it's a person who unsubscribes, not a link
 * scanner opening every link in the email.
 */
export default function UnsubscribePage() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-bold text-slate-900">Unsubscribe from MegaDeal emails?</h1>
      <p className="mt-2 text-sm text-slate-500">You won&apos;t get any more deal emails from us. You can sign up again any time.</p>
      <form method="post" action="/api/email-signup/unsubscribe" className="mt-6">
        <button
          type="submit"
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          Unsubscribe
        </button>
      </form>
    </main>
  );
}
