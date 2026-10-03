"use client";

import { useEffect, useState } from "react";
import type { PublicPlatformSettings } from "./platformSettingsRules";

/**
 * The deal costs, open deal types and longest runs, as the business portal
 * shows them. null while loading, or if they couldn't be loaded: callers
 * then show no cost rather than a guessed one. The server checks all of it
 * again when a deal is submitted, so this is for display only.
 */
export function usePlatformSettings(): PublicPlatformSettings | null {
  const [settings, setSettings] = useState<PublicPlatformSettings | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/platform-settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.everydayCredits === "number") setSettings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return settings;
}
