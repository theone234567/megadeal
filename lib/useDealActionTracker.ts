"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { trackDealEvent, trackEvent } from "./trackDeal";
import type { DealAction } from "./dealEvents";
import type { ContactMethod } from "./dealContact";

const COUNTER_FOR: Record<ContactMethod | "directions", DealAction> = {
  booking: "website",
  website: "website",
  phone: "call",
  email: "email",
  directions: "directions",
};

/**
 * Counts what a customer does on a deal page, two ways:
 * - the deal's running totals the business has always seen (lib/
 *   dealEvents.ts): each action once per visit, plus the visit's one
 *   "interest" (opening the code panel, or the visit's first action);
 * - every action as it happens, for the detailed reports (lib/trackDeal.ts
 *   trackEvent → public.deal_events).
 * Nothing is counted in a preview. The page view is counted once per
 * page, even when React runs its effects twice while developing.
 */
export function useDealActionTracker(dealId: string, preview: boolean, businessSlug: string | null = null) {
  const done = useRef(new Set<DealAction>());
  const interested = useRef(false);
  const viewed = useRef<string | null>(null);

  useEffect(() => {
    if (preview || viewed.current === dealId) return;
    viewed.current = dealId;
    trackDealEvent(dealId, "view");
    trackEvent("deal_view", { dealId, businessSlug });
  }, [dealId, preview, businessSlug]);

  const count = useCallback(
    (action: DealAction) => {
      if (preview || done.current.has(action)) return;
      const first = !interested.current;
      done.current.add(action);
      interested.current = true;
      trackDealEvent(dealId, action, first);
    },
    [dealId, preview],
  );
  /** Opening the code panel, from the price card ("main") or the phone's
   *  bottom bar ("sticky"). */
  const codeClick = useCallback(
    (source: "main" | "sticky") => {
      if (preview) return;
      trackEvent("deal_code_click", { dealId, businessSlug, source });
      if (interested.current) return;
      interested.current = true;
      trackDealEvent(dealId, "click");
    },
    [dealId, preview, businessSlug],
  );
  /** The code is on screen. */
  const reveal = useCallback(() => {
    if (!preview) trackEvent("deal_code_reveal", { dealId, businessSlug, source: "code_panel" });
  }, [dealId, preview, businessSlug]);
  /** The browser confirmed the code was copied. */
  const copied = useCallback(() => {
    if (preview) return;
    count("copy");
    trackEvent("deal_code_copy", { dealId, businessSlug, source: "code_panel" });
  }, [count, dealId, preview, businessSlug]);
  /** A tap on a way to contact the business. */
  const contact = useCallback(
    (method: ContactMethod | "directions", source: "code_panel" | "deal_page") => {
      if (preview) return;
      count(COUNTER_FOR[method]);
      trackEvent("deal_contact_click", { dealId, businessSlug, source, method });
    },
    [count, dealId, preview, businessSlug],
  );
  /** A tap through to the business's profile. */
  const profileClick = useCallback(
    (source: "code_panel" | "deal_page") => {
      if (!preview) trackEvent("business_profile_click", { dealId, businessSlug, source });
    },
    [dealId, preview, businessSlug],
  );
  return useMemo(() => ({ codeClick, reveal, copied, contact, profileClick }), [codeClick, reveal, copied, contact, profileClick]);
}
