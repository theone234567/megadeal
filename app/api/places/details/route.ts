import { NextRequest, NextResponse } from "next/server";
import { tryConsumePlacesQuota } from "@/lib/placesUsageLimiter";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy to Google Place Details (New) — resolves a place picked
 * from the autocomplete list to a street address, city, postcode and
 * lat/lng. Same quota-gated, key-never-in-the-browser design as
 * app/api/places/autocomplete/route.ts.
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId")?.trim().slice(0, 200) ?? "";
  const sessionToken = req.nextUrl.searchParams.get("sessionToken")?.trim().slice(0, 100) ?? "";

  if (!placeId || !sessionToken) {
    return NextResponse.json({ result: null });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ result: null });
  }

  const allowed = await tryConsumePlacesQuota();
  if (!allowed) {
    return NextResponse.json({ result: null });
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "addressComponents,formattedAddress,location",
        },
      }
    );
    if (!res.ok) {
      console.error("[places/details] Google request failed", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ result: null });
    }
    const data = await res.json();
    const components: any[] = data.addressComponents ?? [];
    const find = (type: string) => components.find((c) => c.types?.includes(type))?.longText;
    const street = [find("street_number"), find("route")].filter(Boolean).join(" ");

    // formattedAddress is the full address (street, suburb, city, postcode)
    // but always ends with the country name — strip that trailing segment
    // so the field shows the complete address without "New Zealand" tacked on.
    const country = find("country");
    let fullAddress = data.formattedAddress || street || "";
    if (country && fullAddress.endsWith(`, ${country}`)) {
      fullAddress = fullAddress.slice(0, -(country.length + 2));
    }

    return NextResponse.json({
      result: {
        label: fullAddress,
        street: street || fullAddress || "",
        city: find("locality") || null,
        postcode: find("postal_code") || null,
        lat: typeof data.location?.latitude === "number" ? data.location.latitude : null,
        lon: typeof data.location?.longitude === "number" ? data.location.longitude : null,
      },
    });
  } catch (err) {
    console.error("[places/details] failed", err);
    return NextResponse.json({ result: null });
  }
}
