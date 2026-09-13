"use client";

import Cookies from "js-cookie";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createWixClient, type WixClient } from "@/lib/wixClient";

interface WixContextValue {
  client: WixClient;
  member: any | null | undefined;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
}

const WixContext = createContext<WixContextValue | null>(null);

function readTokens() {
  const raw = Cookies.get("session");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * MegaDeal is an advertising directory, not a payment processor — customers
 * never buy anything through the site, so there's no cart/checkout concept
 * here at all. This client only handles member sign-in (for the merchant
 * portal) and gets passed down for the odd read that still wants it.
 */
export function WixProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createWixClient(readTokens()), []);
  const [member, setMember] = useState<any | null | undefined>(undefined);

  const fetchMember = useCallback(async () => {
    try {
      if (client.auth.loggedIn()) {
        // FULL for the same reason as lib/memberAuth.ts: the portal reads
        // member.loginEmailVerified for its verified badge, and the
        // default fieldset doesn't return that field at all — so a
        // verified merchant was told their email was still pending.
        const { member: current } = await client.members.getCurrentMember({
          fieldsets: ["FULL"],
        });
        setMember(current ?? null);
      } else {
        setMember(null);
      }
    } catch {
      setMember(null);
    }
  }, [client]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const logout = useCallback(async () => {
    const { logoutUrl } = await client.auth.logout(window.location.href);
    Cookies.remove("session");
    window.location.href = logoutUrl;
  }, [client]);

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
