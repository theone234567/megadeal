import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { getOrClaimMerchant } from "@/lib/merchant";
import { isValidSocialUrl, isSafeOptionalUrl } from "@/lib/socialLinks";
import { isValidNzbnFormat, normalizeNzbn } from "@/lib/nzbn";

const MAX_TEXT_LENGTH = 300;
// See apply/route.ts — businessHours is a structured-hours JSON blob, not
// a single-line field, so it needs its own generous length cap.
const MAX_BUSINESS_HOURS_LENGTH = 4000;
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

  const contactName = cleanText(body.contactName, MAX_TEXT_LENGTH);
  const contactPhone = cleanText(body.contactPhone, MAX_TEXT_LENGTH);
  const legalBusinessName = cleanText(body.legalBusinessName, MAX_TEXT_LENGTH);
  if (!contactName || !contactPhone || !legalBusinessName) {
    return NextResponse.json(
      { error: "Contact name, contact phone and legal business name are required." },
      { status: 400 }
    );
  }
  const nzbn = normalizeNzbn(body.nzbn);
  if (!isValidNzbnFormat(nzbn)) {
    return NextResponse.json({ error: "NZBN must be 13 digits." }, { status: 400 });
  }

  const priceRange = cleanText(body.priceRange, 4);
  if (!ALLOWED_PRICE_RANGES.includes(priceRange)) {
    return NextResponse.json({ error: "Invalid price range." }, { status: 400 });
  }

  const bookingEmail = cleanText(body.bookingEmail, MAX_TEXT_LENGTH);
  if (bookingEmail && !EMAIL_RE.test(bookingEmail)) {
    return NextResponse.json({ error: "Enter a valid booking email." }, { status: 400 });
  }

  const website = cleanText(body.website, MAX_TEXT_LENGTH);
  if (!isSafeOptionalUrl(website)) {
    return NextResponse.json({ error: "Enter a valid website address." }, { status: 400 });
  }
  const bookingUrl = cleanText(body.bookingUrl, MAX_TEXT_LENGTH);
  if (!isSafeOptionalUrl(bookingUrl)) {
    return NextResponse.json({ error: "Enter a valid booking link." }, { status: 400 });
  }

  const facebookUrl = cleanText(body.facebookUrl, MAX_TEXT_LENGTH);
  if (!isValidSocialUrl(facebookUrl, "facebook")) {
    return NextResponse.json(
      { error: "Enter a valid Facebook page URL (e.g. facebook.com/yourbusiness)." },
      { status: 400 }
    );
  }
  const instagramUrl = cleanText(body.instagramUrl, MAX_TEXT_LENGTH);
  if (!isValidSocialUrl(instagramUrl, "instagram")) {
    return NextResponse.json(
      { error: "Enter a valid Instagram profile URL (e.g. instagram.com/yourbusiness)." },
      { status: 400 }
    );
  }

  try {
  const adminClient = createWixAdminClient();
  const merchant = await getOrClaimMerchant(adminClient, member);
  if (!merchant) {
    return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
  }

  const address = cleanText(body.address, MAX_TEXT_LENGTH);
  const city = cleanText(body.city, MAX_TEXT_LENGTH);
  const addressChanged = address !== (merchant.address || "") || city !== (merchant.city || "");
  // This form now has the same address-autocomplete/pin-map as signup, so a
  // freshly resolved lat/lng from the client is trustworthy — use it. If
  // the client didn't send one (address typed without picking a
  // suggestion) and the address changed, drop the old coordinates rather
  // than show a map pin at the wrong location; if the address is unchanged,
  // leave whatever was already stored alone.
  const lat = Number.isFinite(body.lat) ? Number(body.lat) : null;
  const lng = Number.isFinite(body.lng) ? Number(body.lng) : null;

  const updated = await adminClient.items.update("Merchants", {
    ...merchant,
    businessName,
    contactName,
    contactPhone,
    legalBusinessName,
    nzbn,
    website,
    phone: cleanText(body.phone, MAX_TEXT_LENGTH),
    address,
    city,
    postcode: cleanText(body.postcode, 20),
    bio: cleanText(body.bio, MAX_BIO_LENGTH),
    businessHours: cleanText(body.businessHours, MAX_BUSINESS_HOURS_LENGTH),
    bookingUrl,
    bookingEmail,
    facebookUrl,
    instagramUrl,
    priceRange,
    amenities: cleanText(body.amenities, MAX_TEXT_LENGTH),
    lat: lat ?? (addressChanged ? null : merchant.lat ?? null),
    lng: lng ?? (addressChanged ? null : merchant.lng ?? null),
    status: "Pending",
    // Keep this in sync with Wix's real verified-email flag rather than
    // letting it go stale between visits.
    emailVerified: member.loginEmailVerified,
  });
  return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[merchants/profile] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
