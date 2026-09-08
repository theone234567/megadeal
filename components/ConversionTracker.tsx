"use client";

import { useEffect } from "react";

/**
 * Event-delegation instrumentation for /list-your-business's conversion
 * funnel — one listener covers every CTA on the page instead of turning
 * each "jump to #signup" link into its own client component just to
 * attach an onClick. CTAs are tagged with data-cta-section in the plain
 * server-rendered markup; FAQ entries fire their own "toggle" event
 * (which doesn't bubble, so those get a direct listener per <details>
 * once the page has mounted). Device category (mobile vs desktop) is
 * already a standard GA4 dimension on every event, including these, so
 * no separate tracking is needed for that split — it's just a report
 * filter on the events below.
 */
export default function ConversionTracker() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest<HTMLElement>("[data-cta-section]");
      if (!target) return;
      window.gtag?.("event", "cta_click", { cta_section: target.dataset.ctaSection });
    }
    document.addEventListener("click", handleClick);

    const detailsEls = Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-faq-question]"));
    function handleToggle(this: HTMLDetailsElement) {
      if (!this.open) return;
      window.gtag?.("event", "faq_open", { faq_question: this.dataset.faqQuestion });
    }
    detailsEls.forEach((el) => el.addEventListener("toggle", handleToggle));

    return () => {
      document.removeEventListener("click", handleClick);
      detailsEls.forEach((el) => el.removeEventListener("toggle", handleToggle));
    };
  }, []);

  return null;
}
