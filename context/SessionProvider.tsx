"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/** The only member details a page is given: enough to show a name and a
 *  badge. Everything else stays on the server. */
export interface SessionMember {
  id: string;
  email: string | null;
  loginEmailVerified: boolean;
  nickname: string | null;
}

interface SessionContextValue {
  /** Undefined until the server has answered, then the member or null. */
  member: SessionMember | null | undefined;
  isLoggedIn: boolean;
  logout: (returnTo?: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Who's signed in to the business portal, for the portal, admin and
 * sign-up pages. Asked of this site's own server (app/api/auth/me), which
 * reads the httpOnly session cookies: the page never handles the
 * credential itself.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<SessionMember | null | undefined>(undefined);

  const fetchMember = useCallback(async () => {
    // Tried three times before giving up (offline for a moment, or a
    // cut-off answer), then treated as signed out.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, attempt * 1000));
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) continue;
        const { member: current } = await res.json();
        setMember(current ?? null);
        return;
      } catch {
        // try again
      }
    }
    setMember(null);
  }, []);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const logout = useCallback(async (returnTo?: string) => {
    // The server ends the session and clears the cookies. If that call
    // fails the page still leaves; the cookies run out on their own.
    const target = returnTo || window.location.origin;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // fall through to the redirect
    }
    window.location.href = target;
  }, []);

  return <SessionContext.Provider value={{ member, isLoggedIn: Boolean(member), logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
