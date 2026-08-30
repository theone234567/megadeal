"use client";

import { useCallback, useEffect, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

export type LocationStatus =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

const CACHE_KEY = "megadeal_geo_v1";
// Long enough to survive browsing between pages without re-prompting, short
// enough that a stale location doesn't linger if someone's genuinely moved.
const CACHE_TTL_MS = 15 * 60 * 1000;

/** Great-circle distance between two lat/lng points, in kilometres. */
export function haversineDistanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function readCache(): Coords | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

function writeCache(coords: Coords) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...coords, savedAt: Date.now() }));
  } catch {
    // sessionStorage can throw in private-browsing edge cases — fine to skip caching.
  }
}

/**
 * Browser-geolocation hook for "deals near me" sorting. Deliberately never
 * requests on mount — only calling request() (wired to the user picking
 * "Nearest to me") triggers the browser's permission prompt, so loading a
 * deals page never surprises anyone with a location popup.
 */
export function useUserLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setCoords(cached);
      setStatus("granted");
    }
  }, []);

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        writeCache(next);
        setCoords(next);
        setStatus("granted");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: CACHE_TTL_MS }
    );
  }, []);

  return { coords, status, request };
}
