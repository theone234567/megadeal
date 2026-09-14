"use client";

import { createContext, useContext } from "react";
import type { MegadealArt } from "@/lib/megadealAssets";

/**
 * Makes the supplied mascot/brand artwork (resolved once, server-side, in
 * the root layout — see getMegadealArt()) reachable from client components
 * that sit below it without prop-drilling.
 *
 * The one client component that needs it today, PortalAuthScreen, is two
 * files deep under two different pages (/portal and /portal/new-deal),
 * both of which are themselves already "use client" — so it cannot call
 * getMegadealArt() itself (that reads the filesystem, which only exists at
 * build time on Node, never in the browser or the Workers runtime it
 * eventually ships to) and threading a prop through both pages would mean
 * editing files that have nothing to do with brand artwork just to pass
 * one string through them. Context reaches straight there instead, the
 * same value the header logo already uses.
 */
const MegadealArtContext = createContext<MegadealArt | null>(null);

export function MegadealArtProvider({
  art,
  children,
}: {
  art: MegadealArt;
  children: React.ReactNode;
}) {
  return <MegadealArtContext.Provider value={art}>{children}</MegadealArtContext.Provider>;
}

/**
 * Returns nulls (never throws) outside the provider, matching
 * getMegadealArt()'s own "everything may be missing" contract — a
 * component reading this should already be written to fall back
 * gracefully via MascotFigure, exactly as if the file just hadn't been
 * supplied yet.
 */
export function useMegadealArt(): MegadealArt {
  return (
    useContext(MegadealArtContext) ?? {
      logo: null,
      aucklandCard: null,
      mascotBigDeals: null,
      mascotWave: null,
      mascotJump: null,
    }
  );
}
