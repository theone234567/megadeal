"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/trackDeal";

/**
 * Counts a view of a business's profile (public.deal_events), once per
 * page, with the deal it was opened from when that's one of the business's
 * own live deals (?from=, as BackToDeal checks). Renders nothing.
 */
export default function ProfileViewTracker({ businessSlug, deals }: { businessSlug: string; deals: { slug: string; id: string }[] }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const from = new URLSearchParams(window.location.search).get("from");
    const deal = from ? deals.find((d) => d.slug === from) : undefined;
    trackEvent("business_profile_view", { businessSlug, dealId: deal?.id ?? null, source: "profile" });
  }, [businessSlug, deals]);
  return null;
}
