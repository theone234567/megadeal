"use client";

import { useEffect, useState } from "react";

/**
 * Sticky mobile-only "Sign up your business" bar for /businesses. The page
 * is long (hero -> offer -> fit -> pre-launch -> preview -> perks -> how it
 * works -> FAQ -> founder note) before the real form, so once a visitor
 * scrolls past the hero there's no CTA back in view until they reach it.
 * Shows once the hero scrolls out of view; hides for good the first time
 * the real signup form comes into view, so there's never two competing
 * CTAs and it doesn't reappear once they've scrolled past the form itself.
 */
export default function StickyApplyBar() {
  const [pastHero, setPastHero] = useState(false);
  const [reachedForm, setReachedForm] = useState(false);

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
      formObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) setReachedForm(true);
      });
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

  const visible = pastHero && !reachedForm;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <a
        href="#signup"
        tabIndex={visible ? 0 : -1}
        className="flex items-center justify-center gap-2 rounded-full bg-brand-600 py-3 text-sm font-bold text-white shadow-card active:scale-95"
      >
        🚀 Sign up your business — up to 3 months free
      </a>
    </div>
  );
}
