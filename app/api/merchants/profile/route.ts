import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { getOrClaimMerchant } from "@/lib/merchant";

const MAX_TEXT_LENGTH = 300;
const MAX_BIO_LENGTH = 600;
const ALLOWED_PRICE_RANGES = ["", "$", "$$", "$$$", "$$$$"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/**
 * Lets a signed-in merchant edit their own public profile fields — the
 * business name, contact details, hours, bio and social links shown on
 * their /business/[slug] page and deal pages. Like the logo route, any
 * change sends the profile back for review before it's shown publicly
 * again, since these are the same fields an approver already vetted once.
 */
export async function POST(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const businessName = cleanText(body.businessName, MAX_TEXT_LENGTH);
  if (!businessName) {
    return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  }

  const priceRange = cleanText(body.priceRange, 4);
  if (!ALLOWED_PRICE_RANGES.includes(priceRange)) {
    return NextResponse.json({ error: "Invalid price range." }, { status: 400 });
  }

  const bookingEmail = cleanText(body.bookingEmail, MAX_TEXT_LENGTH);
  if (bookingEmail && !EMAIL_RE.test(bookingEmail)) {
    return NextResponse.json({ error: "Enter a valid booking email." }, { status: 400 });
  }

  try {
  const adminClient = createWixAdminClient();
  const merchant = await getOrClaimMerchant(adminClient, member);
  if (!merchant) {
    return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
  }

  const address = cleanText(body.address, MAX_TEXT_LENGTH);
  const city = cleanText(body.city, MAX_TEXT_LENGTH);
  // This form has no address-autocomplete/geocoding, so a changed address
  // can't be trusted to still match the stored coordinates — drop them
  // rather than show a map pin at the old location. They're re-captured
  // automatically next time the address is set via the signup flow.
  const addressChanged = address !== (merchant.address || "") || city !== (merchant.city || "");

  const updated = await adminClient.items.update("Merchants", {
    ...merchant,
    businessName,
    website: cleanText(body.website, MAX_TEXT_LENGTH),
    phone: cleanText(body.phone, MAX_TEXT_LENGTH),
    address,
    city,
    postcode: cleanText(body.postcode, 20),
    bio: cleanText(body.bio, MAX_BIO_LENGTH),
    businessHours: cleanText(body.businessHours, MAX_TEXT_LENGTH),
    bookingUrl: cleanText(body.bookingUrl, MAX_TEXT_LENGTH),
    bookingEmail,
    facebookUrl: cleanText(body.facebookUrl, MAX_TEXT_LENGTH),
    instagramUrl: cleanText(body.instagramUrl, MAX_TEXT_LENGTH),
    priceRange,
    amenities: cleanText(body.amenities, MAX_TEXT_LENGTH),
    ...(addressChanged ? { lat: null, lng: null } : {}),
    status: "Pending",
  });
  return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[merchants/profile] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
