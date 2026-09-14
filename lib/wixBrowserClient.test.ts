import { describe, it, expect } from "vitest";
import { createWixBrowserClient } from "./wixBrowserClient";
import { createWixClient } from "./wixClient";

/**
 * These assertions exist to stop a bundle regression that is otherwise
 * invisible. The browser client carries no modules on purpose: attaching
 * one puts that whole SDK package into the page bundle of every route,
 * because WixProvider lives in the root layout. That is how 697 kB of Wix
 * SDK — 59% of all the JavaScript on the site — ended up on /about and
 * /contact, pages with no Wix anything.
 *
 * The risk with trimming it is the opposite failure: removing something
 * sign-in actually needs and finding out from a merchant who can't get
 * into their portal. So both halves are pinned — what must be gone, and
 * what must still be there.
 */
describe("wix browser client", () => {
  const client = createWixBrowserClient();

  it("exposes every auth call the sign-in and signup flows make", () => {
    // lib/wixAuth.ts and app/login-callback both reach through client.auth.
    for (const method of [
      "register",
      "login",
      "processVerification",
      "getMemberTokensForDirectLogin",
      "parseFromUrl",
      "getMemberTokens",
      "sendPasswordResetEmail",
    ]) {
      expect(typeof (client.auth as any)[method], `client.auth.${method}`).toBe("function");
    }
  });

  it("still carries the captcha site keys the forms read off it", () => {
    expect(client.auth).toHaveProperty("captchaVisibleSiteKey");
    expect(client.auth).toHaveProperty("captchaInvisibleSiteKey");
  });

  it("carries no data modules — this is the whole point of the file", () => {
    // Nothing in the browser has ever called these: products and data go
    // through server routes on the admin client, and member identity comes
    // from /api/auth/me.
    expect(client).not.toHaveProperty("productsV3");
    expect(client).not.toHaveProperty("items");
    expect(client).not.toHaveProperty("members");
  });

  it("leaves the server client's members module alone", () => {
    // /api/auth/session and lib/memberAuth call getCurrentMember.
    expect(createWixClient()).toHaveProperty("members");
  });
});
