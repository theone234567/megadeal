"use client";

import type { ReactNode } from "react";

/**
 * "Get launch updates" near the top of the coming-soon V3 page: scrolls to
 * the email form further down and puts focus in its email box, so keyboard
 * and screen-reader users land where the link said. A plain #anchor link
 * without JavaScript. Smooth scrolling only when motion is allowed ("instant", not "auto",
 * which would inherit the site's CSS scroll-behavior: smooth).
 */
export default function ScrollToSignupLink({
  targetId,
  className,
  children,
}: {
  targetId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={(e) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" });
        target.querySelector<HTMLInputElement>("input[type=email]")?.focus({ preventScroll: true });
        history.replaceState(null, "", `#${targetId}`);
      }}
    >
      {children}
    </a>
  );
}
