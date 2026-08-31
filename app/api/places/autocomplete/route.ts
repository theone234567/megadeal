import { NextRequest, NextResponse } from "next/server";
import { tryConsumePlacesQuota } from "@/lib/placesUsageLimiter";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy to Google Places Autocomplete (New) — the API key
 * never reaches the browser this way, and every request first passes the
 * site-wide daily quota check so a leaked/abused key can't run up a bill
 * regardless of what's configured on Google's side. `disabled: true` tells
 * the client (MerchantSignupForm) to fall back to the free geocoder — no
 * key configured, quota hit, or the request itself failed are all treated
 * the same from the client's point of view: address entry never breaks.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const input = typeof body?.input === "string" ? body.input.trim().slice(0, 200) : "";
  const sessionToken = typeof body?.sessionToken === "string" ? body.sessionToken.slice(0, 100) : "";

  if (!input || input.length < 3 || !sessionToken) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [], disabled: true });
  }

  const allowed = await tryConsumePlacesQuota();
  if (!allowed) {
    return NextResponse.json({ suggestions: [], disabled: true });
  }

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({ input, sessionToken, includedRegionCodes: ["nz"] }),
    });
    if (!res.ok) {
      console.error("[places/autocomplete] Google request failed", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ suggestions: [], disabled: true });
    }
    const data = await res.json();
    const suggestions = (data.suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({
        placeId: p.placeId,
        // Predictions are always NZ-scoped (includedRegionCodes above), so
        // the trailing country name is redundant clutter here — drop it.
        label: (p.text?.text ?? "").replace(/,\s*New Zealand$/i, ""),
      }));
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[places/autocomplete] failed", err);
    return NextResponse.json({ suggestions: [], disabled: true });
  }
}
