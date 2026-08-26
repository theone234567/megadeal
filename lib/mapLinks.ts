/**
 * Google Maps deep links — no API key needed for these (only Maps
 * JS/embed usage requires one). Prefers exact coordinates when a business
 * has them (captured from the address-autocomplete geocoder at signup);
 * falls back to a text search on the address so businesses without
 * coordinates yet still get a working link.
 */
function locationQuery({
  lat,
  lng,
  address,
  city,
}: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  city?: string | null;
}): string | null {
  if (typeof lat === "number" && typeof lng === "number") {
    return `${lat},${lng}`;
  }
  const text = [address, city].filter(Boolean).join(", ");
  return text || null;
}

export function getMapUrl(business: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  city?: string | null;
}): string | null {
  const query = locationQuery(business);
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getDirectionsUrl(business: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  city?: string | null;
}): string | null {
  const query = locationQuery(business);
  if (!query) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}
