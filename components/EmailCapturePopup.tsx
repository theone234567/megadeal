"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import EmailSignupForm from "./EmailSignupForm";

const DISMISSED_KEY = "megadeal-email-prompt-dismissed";
const SUBSCRIBED_KEY = "megadeal-email-subscribed";
const SCROLL_TRIGGER_PERCENT = 45;
const TIME_TRIGGER_MS = 18_000;

// Pages where an email-capture popup would just get in the way of the
// actual point of the page — each of these already has its own prominent,
// on-page signup/application form, so a popup on top is redundant at best
// and actively counterproductive on /businesses (interrupting a business
// application with a customer-deals prompt).
const SUPPRESSED_PREFIXES = ["/businesses", "/coming-soon", "/portal", "/admin"];

/**
 * Small, dismissible bottom-corner email-capture prompt — deliberately NOT
 * an on-load/full-screen interstitial. Google actively penalizes mobile
 * pages that cover content with a popup immediately on arrival; this one
 * only appears after a visitor has scrolled ~45% down the page or spent
 * ~18s on it (whichever first), which is also just better practice —
 * asking after someone's shown interest converts better than asking
 * before they've seen anything.
 *
 * Remembers a dismissal (or a signup via any form on the site, not just
 * this one — see EmailSignupForm) in localStorage so it doesn't nag the
 * same visitor again.
 */
export default function EmailCapturePopup() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [armed, setArmed] = useState(false);

  const suppressed = SUPPRESSED_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (suppressed) return;
    try {
      if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(SUBSCRIBED_KEY)) {
        return;
      }
    } catch {
      // Storage unavailable — fall through and arm anyway; worst case the
      // popup can show again on a later visit, which is a minor annoyance,
      // not a broken experience.
    }
    setArmed(true);
  }, [suppressed]);

  useEffect(() => {
    if (!armed) return;

    // The Footer has its own "Stay in the loop" email form — showing this
    // popup on top of (or right next to) that would collide visually and
    // duplicate the exact same ask. Once the footer is in view, the page
    // itself is already making the pitch, so don't show or stay showing.
    const footer = document.querySelector("footer");
    let footerVisible = false;
    const observer = footer
      ? new IntersectionObserver(
          ([entry]) => {
            footerVisible = entry.isIntersecting;
            if (footerVisible) setVisible(false);
          },
          { threshold: 0 }
        )
      : null;
    if (footer && observer) observer.observe(footer);

    const timer = setTimeout(() => {
      if (!footerVisible) setVisible(true);
    }, TIME_TRIGGER_MS);

    function onScroll() {
      if (footerVisible) return;
      const doc = document.documentElement;
      const scrolled = doc.scrollTop;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable > 0 && (scrolled / scrollable) * 100 >= SCROLL_TRIGGER_PERCENT) {
        setVisible(true);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [armed]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Fine — see note above.
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 right-3 z-40 w-[calc(100vw-1.5rem)] max-w-[220px] animate-slide-up rounded-xl border border-slate-100 bg-white p-2.5 shadow-card sm:right-4 sm:bottom-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        ✕
      </button>
      <p className="pr-4 text-xs font-bold text-slate-900">🐘 Get local deals in your inbox</p>
      <div className="mt-2">
        <EmailSignupForm
          audience="customer"
          source="corner-popup"
          buttonLabel="Join"
          accent="brand"
          surface="plain"
        />
      </div>
    </div>
  );
}
