import { createClient, OAuthStrategy, type Tokens } from "@wix/sdk";
import { productsV3 } from "@wix/stores";
import { items } from "@wix/data";
import { members } from "@wix/members";

export const WIX_CLIENT_ID =
  process.env.NEXT_PUBLIC_WIX_CLIENT_ID || "a5df1008-85ea-4479-8a49-8b0576ae9714";

// No cart/ecom/redirects modules: MegaDeal is an advertising directory, not
// a payment processor, so there's no checkout flow anywhere in the app.
export function createWixClient(tokens?: Tokens) {
  return createClient({
    modules: { productsV3, items, members },
    auth: OAuthStrategy({
      clientId: WIX_CLIENT_ID,
      tokens,
    }),
  });
}

export type WixClient = ReturnType<typeof createWixClient>;

let publicClient: WixClient | undefined;

/**
 * A dedicated, always-anonymous client for public catalog browsing (deal
 * listings, category pages, deal detail pages). Deliberately separate from
 * the member-session client in WixProvider: reusing that client's stored
 * cookie tokens for public browsing means a stale/expired member session
 * can silently break catalog reads for a signed-in-looking visitor, even
 * though nothing about browsing deals should depend on being logged in.
 */
export function getPublicWixClient(): WixClient {
  if (!publicClient) {
    publicClient = createWixClient();
  }
  return publicClient;
}
