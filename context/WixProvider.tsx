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
import { currentCart } from "@wix/ecom";
import { createWixClient, WIX_STORES_APP_ID, type WixClient } from "@/lib/wixClient";
import type { Deal } from "@/lib/types";

interface WixContextValue {
  client: WixClient;
  cart: any;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (deal: Deal, quantity?: number) => Promise<void>;
  removeLineItem: (lineItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  checkout: () => Promise<void>;
  isAdding: boolean;
  isCheckingOut: boolean;
  member: any | null | undefined;
  isLoggedIn: boolean;
  login: (returnTo?: string) => Promise<void>;
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

export function WixProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createWixClient(readTokens()), []);
  const [cart, setCart] = useState<any>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [member, setMember] = useState<any | null | undefined>(undefined);

  const fetchCart = useCallback(async () => {
    try {
      const current = await client.currentCart.getCurrentCart();
      setCart(current || {});
    } catch {
      setCart({});
    }
  }, [client]);

  const fetchMember = useCallback(async () => {
    try {
      if (client.auth.loggedIn()) {
        const { member: current } = await client.members.getCurrentMember();
        setMember(current ?? null);
      } else {
        setMember(null);
      }
    } catch {
      setMember(null);
    }
  }, [client]);

  useEffect(() => {
    fetchCart();
    fetchMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (returnTo?: string) => {
      const redirectUri = `${window.location.origin}/login-callback`;
      const originalUri = returnTo || window.location.href;
      const data = client.auth.generateOAuthData(redirectUri, originalUri);
      localStorage.setItem("oauthRedirectData", JSON.stringify(data));
      const { authUrl } = await client.auth.getAuthUrl(data);
      window.location.href = authUrl;
    },
    [client]
  );

  const logout = useCallback(async () => {
    const { logoutUrl } = await client.auth.logout(window.location.href);
    Cookies.remove("session");
    window.location.href = logoutUrl;
  }, [client]);

  const addToCart = useCallback(
    async (deal: Deal, quantity = 1) => {
      setIsAdding(true);
      try {
        const { cart: updatedCart } = await client.currentCart.addToCurrentCart({
          lineItems: [
            {
              catalogReference: {
                appId: WIX_STORES_APP_ID,
                catalogItemId: deal.id,
                options: deal.variantId ? { variantId: deal.variantId } : undefined,
              },
              quantity,
            },
          ],
        });
        setCart(updatedCart);
        setCartOpen(true);
      } finally {
        setIsAdding(false);
      }
    },
    [client]
  );

  const removeLineItem = useCallback(
    async (lineItemId: string) => {
      const { cart: updatedCart } = await client.currentCart.removeLineItemsFromCurrentCart(
        [lineItemId]
      );
      setCart(updatedCart);
    },
    [client]
  );

  const clearCart = useCallback(async () => {
    await client.currentCart.deleteCurrentCart();
    setCart({});
  }, [client]);

  const checkout = useCallback(async () => {
    setIsCheckingOut(true);
    try {
      const { checkoutId } = await client.currentCart.createCheckoutFromCurrentCart({
        channelType: currentCart.ChannelType.WEB,
      });
      const redirect = await client.redirects.createRedirectSession({
        ecomCheckout: { checkoutId },
        callbacks: {
          postFlowUrl:
            typeof window !== "undefined" ? window.location.href : "/",
        },
      });
      if (typeof window !== "undefined") {
        window.location.href = redirect.redirectSession!.fullUrl!;
      }
    } finally {
      setIsCheckingOut(false);
    }
  }, [client]);

  const value: WixContextValue = {
    client,
    cart,
    cartOpen,
    setCartOpen,
    addToCart,
    removeLineItem,
    clearCart,
    checkout,
    isAdding,
    isCheckingOut,
    member,
    isLoggedIn: Boolean(member),
    login,
    logout,
  };

  return <WixContext.Provider value={value}>{children}</WixContext.Provider>;
}

export function useWix() {
  const ctx = useContext(WixContext);
  if (!ctx) throw new Error("useWix must be used within a WixProvider");
  return ctx;
}
