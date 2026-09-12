"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Persistent two-way CTA for /coming-soon on small screens.
 *
 * The page runs to roughly 5,300px on a phone, and it serves two
 * audiences whose actions live in different places — the deal-hunter
 * email form is mid-page, the business signup is on another route. Once
 * a visitor scrolls past the hero fork, neither is reachable without
 * scrolling back. This keeps both one tap away.
 *
 * It stays out of the way where it would be redundant or obstructive:
 * hidden over the hero, hidden again once the launch-updates form is on
 * screen (so it never covers the very field it points at), and hidden
 * entirely from lg up, where the page is short enough and the desktop
 * layout already keeps a CTA in view.
 */
export default function ComingSoonStickyCta() {
  const [pastHero, setPastHero] = useState(false);
  const [signupInView, setSignupInView] = useState(false);

  useEffect(() => {
    let heroObserver: IntersectionObserver | null = null;
    let signupObserver: IntersectionObserver | null = null;
    let rafId = 0;

    function trySetup() {
      const hero = document.getElementById("cs-hero");
      const signup = document.getElementById("launch-updates");
      if (!hero || !signup) {
        rafId = requestAnimationFrame(trySetup);
        return;
      }
      heroObserver = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting));
      signupObserver = new IntersectionObserver(([e]) => setSignupInView(e.isIntersecting));
      heroObserver.observe(hero);
      signupObserver.observe(signup);
    }

    trySetup();
    return () => {
      cancelAnimationFrame(rafId);
      heroObserver?.disconnect();
      signupObserver?.disconnect();
    };
  }, []);

  const visible = pastHero && !signupInView;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#eee7f6] bg-white/95 px-3 py-2.5 shadow-[0_-6px_20px_rgba(40,7,88,.12)] backdrop-blur transition-transform duration-300 lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-xl items-center gap-2.5">
        <a
          href="#launch-updates"
          tabIndex={visible ? 0 : -1}
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-[#e81ea3] px-3 text-[13px] font-extrabold text-white active:scale-95"
        >
          Get updates
        </a>
        <Link
          href="/list-your-business"
          tabIndex={visible ? 0 : -1}
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-[#650fc7] px-3 text-[13px] font-extrabold text-white active:scale-95"
        >
          List my business
        </Link>
      </div>
    </div>
  );
}
