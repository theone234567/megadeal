import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { items } from "@wix/data";

/**
 * Server-only elevated Wix client, authenticated with an account API key
 * instead of a member's OAuth token. Wix's SITE_MEMBER_AUTHOR permission on
 * the Merchants/Deals collections only lets a member touch their own rows —
 * this client is what lets the site owner (via the admin dashboard) and our
 * own validated API routes (via the merchant-facing endpoints) act across
 * every merchant's data. Never import this from a "use client" component —
 * the API key must never reach the browser.
 */
export function createWixAdminClient() {
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;
  if (!apiKey || !siteId) {
    throw new Error(
      "Admin Wix credentials are not configured (WIX_API_KEY / WIX_SITE_ID)."
    );
  }
  return createClient({
    modules: { items },
    auth: ApiKeyStrategy({ apiKey, siteId }),
  });
}
