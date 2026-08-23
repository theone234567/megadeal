import { createClient, OAuthStrategy, type Tokens } from "@wix/sdk";
import { productsV3 } from "@wix/stores";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";

export const WIX_CLIENT_ID =
  process.env.NEXT_PUBLIC_WIX_CLIENT_ID || "a5df1008-85ea-4479-8a49-8b0576ae9714";

export const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

export function createWixClient(tokens?: Tokens) {
  return createClient({
    modules: { productsV3, currentCart, redirects },
    auth: OAuthStrategy({
      clientId: WIX_CLIENT_ID,
      tokens,
    }),
  });
}

export type WixClient = ReturnType<typeof createWixClient>;
