"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  fetchPlacePredictions,
  fetchPlaceDetails,
  newSessionToken,
  type AddressSuggestion,
} from "@/lib/googlePlaces";

const AddressPinMap = dynamic(() => import("@/components/AddressPinMap"), {
  ssr: false,
});

// Free, keyless geocoder (OpenStreetMap-based) — the fallback whenever
// Google's Places proxy is unavailable (no key configured server-side, the
// site-wide daily quota's been hit, or the request just failed), so address
// entry never actually breaks. Its response already includes coordinates
// (GeoJSON [lon, lat]), unlike Google's predictions which need a second
// lookup (fetchPlaceDetails) to resolve to a lat/lng.
async function fetchPhotonSuggestions(query: string): Promise<AddressSuggestion[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "en");
  // Bias results toward New Zealand without excluding other countries.
  url.searchParams.set("lat", "-41.29");
  url.searchParams.set("lon", "174.78");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Address lookup failed");
  const data = await res.json();

  return (data.features ?? []).map((f: any) => {
    const p = f.properties ?? {};
    const street = p.housenumber && p.name ? `${p.housenumber} ${p.name}` : p.name || p.street || "";
    const label = [street, p.city, p.state, p.postcode].filter(Boolean).join(", ");
    const [lon, lat] = f.geometry?.coordinates ?? [];
    return { label, street, city: p.city, postcode: p.postcode, lat, lon };
  });
}

/**
 * Address input with live suggestions (Google Places, falling back to the
 * free geocoder) plus a draggable pin map once coordinates are known.
 * Shared by the merchant signup form and the portal profile-edit form —
 * both feed real lat/lng into the same `businessLat`/`businessLng` fields
 * that drive "near me" search and the deals map, regardless of which
 * geocoder actually resolved the address.
 */
export default function AddressAutocompleteField({
  address,
  onAddressChange,
  onSelect,
  lat = null,
  lon = null,
  onPinMove,
  label = "Business address",
  required = true,
  helperText = "Pick a suggestion so we can show customers a map/directions link.",
}: {
  address: string;
  onAddressChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  lat?: number | null;
  lon?: number | null;
  onPinMove: (lat: number, lng: number) => void;
  label?: string;
  required?: boolean;
  helperText?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // One token per address search — created lazily on the first keystroke of
  // a fresh search, reused across every prediction call, then cleared once
  // a suggestion is picked so the next search starts its own session (this
  // is what keeps Google usage "light" — a whole search-to-pick flow bills
  // as one session instead of once per keystroke).
  const sessionTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (address.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!sessionTokenRef.current) sessionTokenRef.current = newSessionToken();
      const { suggestions: googleResults, disabled } = await fetchPlacePredictions(
        address,
        sessionTokenRef.current
      );
      if (cancelled) return;
      if (!disabled) {
        setSuggestions(googleResults);
        return;
      }
      fetchPhotonSuggestions(address)
        .then((results) => {
          if (!cancelled) setSuggestions(results);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSelect(s: AddressSuggestion) {
    onSelect(s);
    setSuggestions([]);
    setShowSuggestions(false);

    // A Google-sourced suggestion only carries a placeId — coordinates need
    // this second lookup. A Photon suggestion already has everything.
    if (s.placeId) {
      const token = sessionTokenRef.current ?? newSessionToken();
      sessionTokenRef.current = null; // this search's session is now done
      const details = await fetchPlaceDetails(s.placeId, token);
      if (details) onSelect(details);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 font-normal text-ember-600">Required</span>}
      </label>
      <input
        required={required}
        type="text"
        autoComplete="off"
        value={address}
        onChange={(e) => {
          onAddressChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Start typing your street address…"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      {helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {typeof lat === "number" && typeof lon === "number" && (
        <AddressPinMap lat={lat} lng={lon} onMove={onPinMove} />
      )}
    </div>
  );
}
