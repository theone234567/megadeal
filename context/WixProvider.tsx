"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { WixBrowserClient } from "@/lib/wixBrowserClient";

/** The only member details a page is given. Wix's full member object is
 *  contact data; none of it belongs in the browser just to render a name
 *  and a badge. */
export interface SessionMember {
  id: string;
  email: string | null;
  loginEmailVerified: boolean;
  nickname: string | null;
}

interface WixContextValue {
  /** The Wix client once it has loaded, else null. For reading Wix's
   *  captcha site key while rendering; anything that calls Wix awaits
   *  getClient() instead. */
  client: WixBrowserClient | null;
  /** The Wix client, loading it first if need be (lib/wixBrowserClient.ts,
   *  about 100KB of SDK). Rejects if it can't be loaded. */
  getClient: () => Promise<WixBrowserClient>;
  /** What the sign-up and sign-in calls are given (lib/wixAuth.ts or
   *  lib/siteAuth.ts): the Wix client, loaded on demand, for Wix's logins;
   *  nothing for MegaDeal's own, which take no client, so the SDK is never
   *  fetched for them. Throws a plain sentence if Wix's can't be loaded. */
  loginClient: () => Promise<WixBrowserClient>;
  member: SessionMember | null | undefined;
  isLoggedIn: boolean;
  logout: (returnTo?: string) => Promise<void>;
  /** Whose logins the sign-up and sign-in forms use: Wix's, or
   *  MegaDeal's own (lib/siteAuth.ts). From the server's AUTH_BACKEND, by
   *  /api/auth/me, so pages built ahead of time still follow a switch;
   *  known by the time `member` is (both come from the one call). */
  authBackend: "wix" | "supabase";
}

const WixContext = createContext<WixContextValue | null>(null);

/**
 * MegaDeal is an advertising directory, not a payment processor — customers
 * never buy anything through the site, so there's no cart/checkout concept
 * here at all. This client only handles member sign-in (for the merchant
 * portal) and gets passed down for the odd read that still wants it.
 */
export function WixProvider({ children }: { children: React.ReactNode }) {
  // No pre-seeded visitor tokens: middleware used to fetch and cookie one
  // speculatively on every first-touch request, at a real cost to every
  // visitor for a benefit only the sign-in/sign-up flows below ever
  // cashed in (see middleware.ts). The SDK generates its own on demand,
  // lazily, the first time one of those flows actually calls client.auth
  // — this client is never a signed-in client regardless (member tokens
  // live in an httpOnly cookie this can't see), so a visitor token only
  // ever mattered for Custom Login's register/login/verify state machine
  // and the captcha site keys hanging off client.auth in the first place.
  //
  // The SDK itself is loaded on demand too, not with the page: it's about
  // 100KB that the sign-up page (one that should be fast for search) and
  // the portal would otherwise download before showing anything. Once the
  // page is idle it's fetched in the background, and only while Wix's
  // logins are the ones in use (authBackend below), so after the switch
  // to MegaDeal's own logins it isn't downloaded at all. A form submitted
  // before it arrives just waits for it (getClient).
  const [client, setClient] = useState<WixBrowserClient | null>(null);
  const loading = useRef<Promise<WixBrowserClient> | null>(null);
  const getClient = useCallback(() => {
    if (!loading.current) {
      loading.current = import("@/lib/wixBrowserClient").then(({ createWixBrowserClient }) => {
        const c = createWixBrowserClient();
        setClient(c);
        return c;
      });
      // A failed download (offline for a moment) can be tried again.
      loading.current.catch(() => {
        loading.current = null;
      });
    }
    return loading.current;
  }, []);
  const [member, setMember] = useState<SessionMember | null | undefined>(undefined);
  const [authBackend, setAuthBackend] = useState<"wix" | "supabase">("wix");

  const fetchMember = useCallback(async () => {
    // Asked of our own server, which reads the httpOnly cookie. This used
    // to ask Wix directly using tokens read out of document.cookie, and
    // that requirement is precisely what forced the tokens to be
    // script-readable in the first place.
    //
    // Tried three times before giving up: until this answers, the forms
    // don't know whose logins to use, and giving up falls back to Wix's.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, attempt * 1000));
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) continue;
        const { member: current, authBackend: backend } = await res.json();
        setAuthBackend(backend === "supabase" ? "supabase" : "wix");
        setMember(current ?? null);
        return;
      } catch {
        // offline for a moment, or a cut-off answer: try again
      }
    }
    setMember(null);
  }, []);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  // Warm the SDK once the page has settled, so a sign-up or sign-in
  // rarely waits for it — but only once we know Wix's logins are in use.
  useEffect(() => {
    if (member === undefined || authBackend !== "wix") return;
    const warm = () => void getClient().catch(() => {});
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 1500);
    return () => clearTimeout(id);
  }, [member, authBackend, getClient]);

  const logout = useCallback(async (returnTo?: string) => {
    // The server clears the cookie and builds the Wix logout URL, since
    // that needs the tokens. If anything goes wrong the session is still
    // ended here — falling back to the home page is a worse experience
    // than a clean Wix logout, but never a less safe one.
    const target = returnTo || window.location.origin;
    let logoutUrl: string | null = null;
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: target }),
      });
      if (res.ok) ({ logoutUrl } = await res.json());
    } catch {
      // fall through to the plain redirect below
    }
    window.location.href = logoutUrl || target;
  }, []);

  const loginClient = useCallback(async () => {
    // lib/siteAuth.ts ignores its client argument.
    if (authBackend === "supabase") return null as unknown as WixBrowserClient;
    try {
      return await getClient();
    } catch {
      throw new Error("We couldn't reach our sign-in service. Please refresh the page and try again.");
    }
  }, [authBackend, getClient]);

  const value: WixContextValue = {
    client,
    getClient,
    loginClient,
    member,
    isLoggedIn: Boolean(member),
    logout,
    authBackend,
  };

  return <WixContext.Provider value={value}>{children}</WixContext.Provider>;
}

export function useWix() {
  const ctx = useContext(WixContext);
  if (!ctx) throw new Error("useWix must be used within a WixProvider");
  return ctx;
}
