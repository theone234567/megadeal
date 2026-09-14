import Link from "next/link";
import ElephantMascot from "@/components/ElephantMascot";
import MerchantLoginForm from "./MerchantLoginForm";

/**
 * The signed-out screen for anything under /portal.
 *
 * There were two of these, byte-for-byte identical apart from their
 * wording — /portal and /portal/new-deal — and both opened with a system
 * emoji padlock, a grey heading and two hairline inputs floating in an
 * otherwise empty white page. On a desktop that is roughly 800px of
 * nothing. It is also the first screen a business owner sees coming back
 * to MegaDeal, and it looked like a different, much plainer product than
 * the one they signed up to.
 *
 * One component now, so the next change lands on both. The treatment is
 * the site's own, not a new one: the Hero's brand gradient, the portal's
 * own font-display headings, and the rounded-2xl/shadow-card vocabulary
 * the deal cards already use. No ember/pink — the accent belongs to deals
 * and discounts, and a sign-in screen is not either of those.
 */
export default function PortalAuthScreen({
  title,
  intro,
  redirectTo,
}: {
  title: string;
  intro: string;
  redirectTo?: string;
}) {
  // -mb-16 below cancels the footer's own mt-16. That margin is the site's
  // spacing convention and looks like ordinary whitespace on every page
  // whose <main> is white — but a margin cannot be painted over, so against
  // a tinted main it becomes a 64px stripe of body white between the panel
  // and the footer, which reads as a rendering fault. Cancelled here rather
  // than by changing the footer, which would shift the spacing of every
  // other page in the site. (The durable fix is for the footer to own that
  // space as padding instead of margin.)
  return (
    <main className="-mb-16 bg-brand-50">
      {/* Full viewport height, so the tint runs all the way to the footer.
          body is `min-h-screen bg-white` with no flex, so a <main> shorter
          than the screen leaves the body's own white showing through
          between it and the footer — three near-white bands stacked, which
          reads as a rendering fault. It was invisible until now only
          because this main used to be white as well. (The general fix is a
          flex-column body with a growing wrapper around the page, which
          would also tidy the 404s and the other short pages; that is a
          site-wide change and doesn't belong in this one.) */}
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:py-14">
        <div className="overflow-hidden rounded-3xl bg-white shadow-card-hover">
          {/* The brand actually showing up. A white disc behind the mascot
              because it was drawn to sit on white beside the wordmark, and
              a purple ground would eat its outline. */}
          <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 py-7 text-center">
            <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow">
              <ElephantMascot className="h-11 w-11" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">
              MegaDeal for business
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">{title}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-brand-50">{intro}</p>
          </div>

          <div className="px-5 py-6 sm:px-7">
            <MerchantLoginForm redirectTo={redirectTo} />
          </div>
        </div>

        {/* Signing up is the second real action on this screen, not a
            footnote — it used to be a text link trailing the form. */}
        <div className="mt-5 rounded-2xl border border-brand-100 bg-white px-5 py-5 text-center">
          <p className="text-sm font-semibold text-slate-700">New to MegaDeal?</p>
          <Link
            href="/list-your-business#signup"
            className="mt-3 inline-block rounded-full border-2 border-brand-600 px-5 py-2.5 text-sm font-extrabold text-brand-700 transition hover:bg-brand-600 hover:text-white active:scale-95"
          >
            Sign up your business →
          </Link>
        </div>
      </div>
    </main>
  );
}
