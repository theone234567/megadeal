/**
 * The headless OAuth client id, in a module of its own so that importing
 * it costs nothing. Both Wix client factories need it, and they must not
 * import each other: the browser factory exists precisely so that the
 * server factory's modules stay out of the page bundle.
 */
export const WIX_CLIENT_ID =
  process.env.NEXT_PUBLIC_WIX_CLIENT_ID || "a5df1008-85ea-4479-8a49-8b0576ae9714";
