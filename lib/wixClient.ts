import { createClient, OAuthStrategy, type Tokens } from "@wix/sdk";
import { members } from "@wix/members";
import { WIX_CLIENT_ID } from "./wixClientId";

export { WIX_CLIENT_ID };

/**
 * The member-scoped Wix client used by server code (session, logout,
 * memberAuth). `members` is here because those paths call
 * getCurrentMember; nothing else is, and that is deliberate.
 *
 * `productsV3` and `items` used to be attached as well and were never
 * called through this client by anyone, on either side of the wire —
 * product and data access goes through createWixAdminClient, which has its
 * own copies. Carrying them here cost 392 kB of Stores SDK in the browser
 * bundle of every page on the site.
 *
 * Browser code must use createWixBrowserClient (lib/wixBrowserClient.ts)
 * instead, which drops `members` too.
 */
export function createWixClient(tokens?: Tokens) {
  return createClient({
    modules: { members },
    auth: OAuthStrategy({
      clientId: WIX_CLIENT_ID,
      tokens,
    }),
  });
}

export type WixClient = ReturnType<typeof createWixClient>;
