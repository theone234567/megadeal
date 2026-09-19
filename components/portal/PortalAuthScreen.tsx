"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MascotFigure from "@/components/megadeal/MascotFigure";
import { useMegadealArt } from "@/context/MegadealArtProvider";
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
  const art = useMegadealArt();

  // Being signed into both at once is confusing (which account is this
  // page even acting as?) and not something a real visitor should ever
  // land in deliberately — it only ever happened by opening the admin
  // password form and a business login in the same browser. undefined
  // while the check is in flight, so the form doesn't flash on then off.
  const [adminActive, setAdminActive] = useState<boolean | undefined>(undefined);
  const [signingOutAdmin, setSigningOutAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session")
      .then((res) => (res.ok ? res.json() : { isAdmin: false }))
      .then(({ isAdmin }) => {
        if (!cancelled) setAdminActive(Boolean(isAdmin));
      })
      .catch(() => {
        if (!cancelled) setAdminActive(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOutAdmin() {
    setSigningOutAdmin(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setAdminActive(false);
      setSigningOutAdmin(false);
    }
  }

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
      {/* py trimmed down from py-10/py-14: this screen sits below the sticky
          site header, and a real desktop browser window is usually shorter
          than the full screen height once chrome (tabs, address bar) is
          subtracted — the old padding pushed the sign-in card itself below
          the fold on ordinary laptop-sized windows, not just short ones. */}
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-6 sm:py-8">
        <div className="overflow-hidden rounded-3xl bg-white shadow-card-hover">
          {/* The mascot overlaps the top edge rather than sitting inside a
              tiny badge circle. The earlier version boxed it into an 11x11
              (44px) disc, sized for the old flat hand-drawn icon — but the
              supplied illustrations are detailed 3D renders, the same
              artwork used at 120-190px everywhere else on the site
              (app/coming-soon/page.tsx). Shrunk to 44px that detail turns
              to mush; shown at its own scale it reads the way it was
              actually drawn. "Waving" doubles as a plain-language greeting
              on a sign-in screen, which the old icon's static face didn't. */}
          <div className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-6 pb-6 pt-28 text-center">
            {/* Plain box-centering (-translate-x-1/2). A previous version
                used -58% on the theory that the head/ears were visually
                heavier on the right than the raised hand was on the left —
                but a pixel-level alpha-centroid check of the source artwork
                puts its visual weight at 50.3% of its own width, essentially
                dead center (the two big round ears are symmetric, and the
                raised hand on the left roughly balances the small paw on
                the lower right). The -58% offset was an 8%-of-width
                overcorrection in the wrong direction, which is what still
                read as off-center. */}
            <MascotFigure
              src={art.mascotWave}
              fallbackSrc="/brand/megadeal-elephant.svg"
              alt=""
              width={320}
              height={250}
              priority
              className="absolute left-1/2 top-0 h-auto w-[128px] -translate-x-1/2 drop-shadow-[0_10px_18px_rgba(37,10,77,.35)]"
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">
              MegaDeal for business
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">{title}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-brand-50">{intro}</p>
          </div>

          <div className="px-5 py-5 sm:px-7">
            {adminActive ? (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-sm font-bold text-amber-900">⚠️ You&apos;re signed in as admin</p>
                <p className="mt-1.5 text-sm text-amber-800">
                  The admin dashboard and a business account are two different logins — being in
                  both at once gets confusing about which one you&apos;re acting as. Sign out of
                  admin first, then sign in here as the business.
                </p>
                <button
                  onClick={signOutAdmin}
                  disabled={signingOutAdmin}
                  className="mt-3 rounded-full bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {signingOutAdmin ? "Signing out…" : "Sign out of admin"}
                </button>
              </div>
            ) : (
              <MerchantLoginForm redirectTo={redirectTo} />
            )}
          </div>
        </div>

        {/* Signing up is the second real action on this screen, not a
            footnote — it used to be a text link trailing the form. Hidden
            while an admin session is active for the same reason the login
            form above is — signing up would just create the same
            signed-in-as-both mess with a brand-new account. */}
        {!adminActive && (
          <div className="mt-4 rounded-2xl border border-brand-100 bg-white px-5 py-5 text-center">
            <p className="text-sm font-semibold text-slate-700">New to MegaDeal?</p>
            <Link
              href="/list-your-business#signup"
              className="mt-3 inline-block rounded-full border-2 border-brand-600 px-5 py-2.5 text-sm font-extrabold text-brand-700 transition hover:bg-brand-600 hover:text-white active:scale-95"
            >
              Sign up your business →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
