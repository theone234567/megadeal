"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createWixBrowserClient, type WixBrowserClient } from "@/lib/wixBrowserClient";

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
  client: WixBrowserClient;
  member: SessionMember | null | undefined;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
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
  const client = useMemo(() => createWixBrowserClient(), []);
  const [member, setMember] = useState<SessionMember | null | undefined>(undefined);

  const fetchMember = useCallback(async () => {
    // Asked of our own server, which reads the httpOnly cookie. This used
    // to ask Wix directly using tokens read out of document.cookie, and
    // that requirement is precisely what forced the tokens to be
    // script-readable in the first place.
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setMember(null);
        return;
      }
      const { member: current } = await res.json();
      setMember(current ?? null);
    } catch {
      setMember(null);
    }
  }, []);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const logout = useCallback(async () => {
    // The server clears the cookie and builds the Wix logout URL, since
    // that needs the tokens. If anything goes wrong the session is still
    // ended here — falling back to the home page is a worse experience
    // than a clean Wix logout, but never a less safe one.
    let logoutUrl: string | null = null;
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: window.location.origin }),
      });
      if (res.ok) ({ logoutUrl } = await res.json());
    } catch {
      // fall through to the plain redirect below
    }
    window.location.href = logoutUrl || "/";
  }, []);

  const value: WixContextValue = {
    client,
    member,
    isLoggedIn: Boolean(member),
    logout,
  };

  return <WixContext.Provider value={value}>{children}</WixContext.Provider>;
}

export function useWix() {
  const ctx = useContext(WixContext);
  if (!ctx) throw new Error("useWix must be used within a WixProvider");
  return ctx;
}
