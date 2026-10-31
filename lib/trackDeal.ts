import type { DealEvent } from "./dealEvents";
import type { DealEventName } from "./dealEventLog";

/**
 * Fire-and-forget merchant analytics ping — never awaited by callers, and
 * failures are swallowed, since a lost analytics event should never affect
 * the visitor's experience. `firstInterest` also counts the visit's one
 * "interest" (clickCount) in the same request.
 */
export function trackDealEvent(productId: string, event: DealEvent, firstInterest = false) {
  try {
    fetch("/api/deals/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, event, ...(firstInterest ? { firstInterest: true } : {}) }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * One action, for the detailed reports (public.deal_events via
 * /api/deals/events, lib/dealEventLog.ts). Each action gets its own id
 * here, once, and keeps it if it has to be sent again, so a resend can't
 * count twice. Sent with keepalive, so a tap that opens another page still
 * gets through, and never holds that page up.
 *
 * Sent with it: an anonymous id for this browser tab's visit (made here,
 * kept only for the tab, never a cookie) so reports can count visits, and
 * where the visit came from (another site's name, and any utm_ campaign
 * tags), read when the visit began. Nothing else about the visitor.
 */
export function trackEvent(
  event: DealEventName,
  data: { dealId?: string | null; businessSlug?: string | null; source?: string; method?: string },
) {
  if (typeof window === "undefined") return;
  // The same action in Google Analytics too, so it can be marked as a
  // conversion there (a code copy, a call or booking tap). Only what's
  // public on the page: which deal, which business, which button.
  try {
    window.gtag?.("event", event, {
      deal_id: data.dealId ?? undefined,
      business_slug: data.businessSlug ?? undefined,
      // Not "source": Google Analytics reads an event's source (and
      // medium, campaign) as the visit's traffic source, so a code reveal
      // relabelled a visit from a Facebook ad as "code_panel / (not set)"
      // (owner's report, 31 Oct 2026). Which button it was goes as
      // click_location instead.
      click_location: data.source,
      method: data.method,
    });
  } catch {
    // ignore
  }
  const payload = { eventId: newId(), event, sessionId: visitId(), ...visitSource(), ...data };
  const send = () =>
    fetch("/api/deals/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [payload] }),
      keepalive: true,
    });
  try {
    send()
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
      })
      .catch(() => {
        // Once more, same id: if the first did arrive, this stores nothing.
        setTimeout(() => send().catch(() => {}), 2000);
      });
  } catch {
    // ignore
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function visitId(): string | null {
  try {
    let id = sessionStorage.getItem("md_visit");
    if (!id) {
      const b = new Uint8Array(12);
      crypto.getRandomValues(b);
      id = btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      sessionStorage.setItem("md_visit", id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Where this visit came from, worked out on its first page and kept for
 *  the tab: the other site's name only (never the page), and utm_ tags. */
function visitSource(): { referrerHost?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  try {
    const saved = sessionStorage.getItem("md_visit_source");
    if (saved) return JSON.parse(saved);
    const out: Record<string, string> = {};
    if (document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.origin !== window.location.origin) out.referrerHost = ref.hostname;
    }
    const q = new URLSearchParams(window.location.search);
    for (const [k, key] of [["utm_source", "utmSource"], ["utm_medium", "utmMedium"], ["utm_campaign", "utmCampaign"]] as const) {
      const v = q.get(k);
      if (v) out[key] = v.slice(0, 60);
    }
    sessionStorage.setItem("md_visit_source", JSON.stringify(out));
    return out;
  } catch {
    return {};
  }
}
