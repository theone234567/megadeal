import { createClient, OAuthStrategy, type Tokens } from "@wix/sdk";
import { WIX_CLIENT_ID } from "./wixClientId";

/**
 * The Wix client for code that runs in the browser — and deliberately the
 * smallest one that can do the job.
 *
 * Every page was shipping 697 kB of Wix SDK (uncompressed), 59% of all the
 * JavaScript on the site, because the single shared factory attached
 * `productsV3`, `items` and `members` and WixProvider sits in the root
 * layout. /about, /contact, /terms — pages with no Wix anything — all paid
 * for it. `productsV3` alone is 392 kB, and nothing in the browser has
 * ever called it: every product and data read goes through a server route
 * using the admin client. It was pure freight.
 *
 * What the browser genuinely needs is only `client.auth` — Custom Login's
 * register/login/verify state machine and the captcha site keys hanging
 * off it, exactly as WixProvider's own comment describes. `auth` comes
 * from the strategy rather than a module, so this needs no modules at all.
 * Member identity is read from /api/auth/me, not from the SDK here.
 *
 * Kept in its own file rather than as a second export of wixClient.ts so
 * that the import graph, not tree-shaking, is what keeps `@wix/members`
 * out of the page.
 */
export function createWixBrowserClient(tokens?: Tokens) {
  return createClient({
    auth: OAuthStrategy({ clientId: WIX_CLIENT_ID, tokens }),
  });
}

export type WixBrowserClient = ReturnType<typeof createWixBrowserClient>;
