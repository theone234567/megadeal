"use client";

export interface AddressSuggestion {
  label: string;
  street: string;
  city?: string | null;
  postcode?: string | null;
  lat?: number | null;
  lon?: number | null;
  /** Present only for a Google-sourced suggestion — a second lookup
   * (fetchPlaceDetails) is needed to resolve it to a street/city/coords. */
  placeId?: string;
}

/** Groups a whole autocomplete-to-selection flow into one billed Google
 * "session" instead of billing every keystroke separately — create once
 * per fresh address search (see MerchantSignupForm) and reuse it across
 * every predictions call and the final details call for that search. */
export function newSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Calls our own /api/places/autocomplete proxy (never Google directly —
 * the API key lives server-only). `disabled: true` means Google's path is
 * unavailable right now (no key configured, the site-wide daily quota was
 * hit, or the request failed) — the caller should fall back to the free
 * geocoder rather than treating it as "no results."
 */
export async function fetchPlacePredictions(
  query: string,
  sessionToken: string
): Promise<{ suggestions: AddressSuggestion[]; disabled: boolean }> {
  try {
    const res = await fetch("/api/places/autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: query, sessionToken }),
    });
    if (!res.ok) return { suggestions: [], disabled: true };
    const data = await res.json();
    const suggestions: AddressSuggestion[] = (data.suggestions ?? []).map((s: any) => ({
      label: s.label,
      street: s.label,
      placeId: s.placeId,
    }));
    return { suggestions, disabled: Boolean(data.disabled) };
  } catch {
    return { suggestions: [], disabled: true };
  }
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionToken: string
): Promise<AddressSuggestion | null> {
  try {
    const res = await fetch(
      `/api/places/details?placeId=${encodeURIComponent(placeId)}&sessionToken=${encodeURIComponent(sessionToken)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ?? null;
  } catch {
    return null;
  }
}
