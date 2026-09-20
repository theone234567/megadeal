import { createHash } from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const GRAPH_VERSION = "v21.0";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

interface CapiUserData {
  email?: string;
  /** Any formatting is fine — digits are extracted before hashing. */
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  /** The `_fbp`/`_fbc` values from lib/attribution.ts — improve event
   *  match quality, i.e. how confidently Meta can tie this server-side
   *  event back to the browser session an ad actually drove. */
  fbp?: string;
  fbc?: string;
}

interface CapiEventInput {
  /** One of Meta's standard event names (e.g. "CompleteRegistration"). */
  eventName: string;
  /** Shared with the matching trackMetaPixelEvent call (see
   *  lib/metaPixel.ts) so Meta dedupes the two into one conversion. */
  eventId: string;
  eventSourceUrl: string;
  userData: CapiUserData;
  customData?: Record<string, unknown>;
}

/**
 * Sends a server-side conversion event to Meta via the Conversions API.
 * Meta recommends running this alongside the browser Pixel rather than as
 * a replacement — the Pixel can be blocked by ad blockers or dropped by
 * browser privacy features, while this call comes straight from our own
 * server and is paired with the browser event via a shared eventId so
 * Meta counts them as one conversion, not two.
 *
 * No-ops (never throws) when NEXT_PUBLIC_META_PIXEL_ID or
 * META_CAPI_ACCESS_TOKEN aren't configured — same "inert until both env
 * vars exist" pattern as components/MetaPixel.tsx. META_CAPI_ACCESS_TOKEN
 * is deliberately NOT a NEXT_PUBLIC_ var — unlike the pixel ID it must
 * never reach the browser, so it belongs in the Cloudflare dashboard under
 * this Worker's Settings -> Variables and Secrets (runtime, encrypted),
 * not the build-time Environment variables the NEXT_PUBLIC_ vars use.
 */
export async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventSourceUrl,
  userData,
  customData,
}: CapiEventInput): Promise<void> {
  if (!PIXEL_ID || !ACCESS_TOKEN) return;

  try {
    const user_data: Record<string, unknown> = {};
    if (userData.email) user_data.em = [sha256(userData.email)];
    if (userData.phone) {
      // Meta expects digits only — no leading +, spaces or dashes.
      const digits = userData.phone.replace(/\D/g, "");
      if (digits) user_data.ph = [sha256(digits)];
    }
    if (userData.clientIp) user_data.client_ip_address = userData.clientIp;
    if (userData.userAgent) user_data.client_user_agent = userData.userAgent;
    if (userData.fbp) user_data.fbp = userData.fbp;
    if (userData.fbc) user_data.fbc = userData.fbc;

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              event_source_url: eventSourceUrl,
              action_source: "website",
              user_data,
              ...(customData ? { custom_data: customData } : {}),
            },
          ],
        }),
      }
    );
    if (!res.ok) {
      console.error("[metaCapi] Meta rejected the event", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    // Ad measurement must never break the actual signup it's attached to.
    console.error("[metaCapi] failed to send event", err);
  }
}
