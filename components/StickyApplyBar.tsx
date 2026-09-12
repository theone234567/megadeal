"use client";

import { useEffect, useState } from "react";

/**
 * Sticky "Sign up your business" bar for /list-your-business. The page is
 * long (hero -> offer -> fit -> pre-launch -> preview -> perks -> how it
 * works -> FAQ -> founder note) before the real form, so once a visitor
 * scrolls past the hero there's no CTA back in view until they reach it.
 * Shows once the hero scrolls out of view and hides whenever the real
 * signup form is on screen, so the two never compete.
 *
 * It used to latch instead — hiding permanently the first time the form
 * was seen. That made sense when the form sat at the bottom of the page,
 * but the form was later moved up: it now starts around y=1700 of a
 * ~7500px page, only about 1000px below the hero. The latch therefore
 * tripped almost immediately and the bar stayed hidden for the remaining
 * ~5700px (perks, how it works, FAQ, founder note, final CTA), which is
 * exactly the stretch it exists to cover. Tracking current visibility
 * instead brings it back once the form scrolls away again.
 *
 * This used to be `sm:hidden`, i.e. phones only — which left every tablet
 * and desktop visitor scrolling ~25 sections of sales copy with no way to
 * act on it. It now shows at every width; on wider screens it sits as a
 * centred pill rather than a full-width band, so it reads as a floating
 * action rather than a mobile app bar.
 */
export default function StickyApplyBar() {
  const [pastHero, setPastHero] = useState(false);
  const [formInView, setFormInView] = useState(false);

  useEffect(() => {
    let heroObserver: IntersectionObserver | null = null;
    let formObserver: IntersectionObserver | null = null;
    let rafId: number;

    // #signup lives inside MerchantSignupForm, which is wrapped in
    // <Suspense> (it calls useSearchParams) — it can still be missing from
    // the DOM on this effect's first run, so poll a frame at a time until
    // both targets exist rather than giving up after one check.
    function trySetup() {
      const hero = document.getElementById("hero");
      const form = document.getElementById("signup");
      if (!hero || !form) {
        rafId = requestAnimationFrame(trySetup);
        return;
      }
      heroObserver = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting));
      formObserver = new IntersectionObserver(([entry]) => setFormInView(entry.isIntersecting));
      heroObserver.observe(hero);
      formObserver.observe(form);
    }

    trySetup();
    return () => {
      cancelAnimationFrame(rafId);
      heroObserver?.disconnect();
      formObserver?.disconnect();
    };
  }, []);

  const visible = pastHero && !formInView;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:rounded-full sm:border sm:px-2 sm:py-2 sm:shadow-[0_10px_30px_rgba(40,7,88,.22)] ${
        visible ? "translate-y-0" : "translate-y-[150%]"
      }`}
    >
      <a
        href="#signup"
        tabIndex={visible ? 0 : -1}
        onClick={() => window.gtag?.("event", "cta_click", { cta_section: "sticky_bar" })}
        className="flex items-center justify-center gap-2 rounded-full bg-brand-600 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95 sm:px-7"
      >
        CLAIM MY FREE ADVERTISING →
      </a>
    </div>
  );
}
