import { availableMethods } from "@/lib/contactOverride";
import { hasMarkup, NAME_MARKUP_MESSAGE } from "@/lib/nameRules";
import { isContactMethod } from "@/lib/dealContact";
import { NextRequest, NextResponse } from "next/server";
import { isBookingChoice } from "@/lib/booking";
import { phoneLink } from "@/lib/booking";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createDataClient } from "@/lib/dataClient";
import { getOrClaimMerchant, statusAfterMerchantEdit } from "@/lib/merchant";
import { notifyBusinessChanged } from "@/lib/indexNowDeal";
import { isValidSocialUrl, isSafeOptionalUrl } from "@/lib/socialLinks";
import { isValidNzbnFormat, normalizeNzbn } from "@/lib/nzbn";
import { isBusinessCategory } from "@/lib/categories";
import { PROFILE_FIELD_LABELS, merchantForBusiness, profileChanges, reviewProfileChanges, type ReviewedField } from "@/lib/profileReview";
import { emailProfileChange } from "@/lib/profileReviewEmail";
import { businessHoursError } from "@/lib/businessHours";

const MAX_TEXT_LENGTH = 300;
// See apply/route.ts — businessHours is a structured-hours JSON blob, not
// a single-line field, so it needs its own generous length cap.
// Room for the weekly schedule plus up to 30 dated exceptions (worst case
// ~5.5k): cut short, the JSON would no longer parse.
const MAX_BUSINESS_HOURS_LENGTH = 8000;
const MAX_BIO_LENGTH = 600;
const MIN_BIO_LENGTH = 50;
const ALLOWED_PRICE_RANGES = ["", "$", "$$", "$$$", "$$$$"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/**
 * Lets a signed-in merchant edit their own public profile fields — the
 * business name, contact details, hours, bio and social links shown on
 * their /business/[slug] page and deal pages. Changing the business's
 * identity (name, legal name, NZBN, category) sends an approved profile
 * back for review; contact details, hours, links and the description save
 * straight away (see statusAfterMerchantEdit).
 */
export async function POST(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (await memberRateLimited("merchant-profile", member.id, 20, HOUR)) {
    return NextResponse.json(
      { error: "You've saved that a lot in a short time. Please try again shortly." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Collected rather than returned as soon as one fails, so a merchant who's
  // missing several fields sees all of them at once instead of fixing one,
  // resubmitting, and being told about the next.
  const fieldErrors: Record<string, string> = {};

  const businessName = cleanText(body.businessName, MAX_TEXT_LENGTH);
  if (!businessName) fieldErrors.businessName = "Business name is required.";
  else if (hasMarkup(businessName)) fieldErrors.businessName = NAME_MARKUP_MESSAGE;

  const contactName = cleanText(body.contactName, MAX_TEXT_LENGTH);
  if (!contactName) fieldErrors.contactName = "Contact name is required.";
  else if (hasMarkup(contactName)) fieldErrors.contactName = NAME_MARKUP_MESSAGE;
  const contactPhone = cleanText(body.contactPhone, MAX_TEXT_LENGTH);
  if (!contactPhone) fieldErrors.contactPhone = "Contact phone is required.";
  // A real number (security pack T140): the deal form offers it as the
  // deal's call button ("Use my phone"), so "abc" mustn't get that far.
  else if (!phoneLink(contactPhone)) fieldErrors.contactPhone = "Enter a full phone number, including the area code.";
  const legalBusinessName = cleanText(body.legalBusinessName, MAX_TEXT_LENGTH);
  if (!legalBusinessName) fieldErrors.legalBusinessName = "Legal business name is required.";
  else if (hasMarkup(legalBusinessName)) fieldErrors.legalBusinessName = NAME_MARKUP_MESSAGE;

  // Same required set as signup (app/api/merchants/apply/route.ts) — without
  // this, a merchant could blank out their public phone/address/city here
  // and it would save silently, degrading a listing that was required to
  // have all three when it was first approved.
  const phone = cleanText(body.phone, MAX_TEXT_LENGTH);
  if (!phone) fieldErrors.phone = "Booking phone number is required.";
  // It's shown to customers as a tap-to-call booking number, so it has to
  // be a real one — "12" used to be accepted and then silently hidden.
  else if (!phoneLink(phone)) fieldErrors.phone = "Enter a full phone number, including the area code.";
  const address = cleanText(body.address, MAX_TEXT_LENGTH);
  if (!address) fieldErrors.address = "Address is required.";
  const city = cleanText(body.city, MAX_TEXT_LENGTH);
  if (!city) fieldErrors.city = "City is required.";
  // What customers and searches see ("Glenfield, Auckland"), and in the
  // deal pages' titles. The city again there says nothing (a browser's
  // autofill put "Auckland" in it).
  const suburb = cleanText(body.suburb, 40);
  if (!suburb) fieldErrors.suburb = "Suburb is required.";
  else if (city && city !== "Other" && suburb.toLowerCase() === city.toLowerCase()) {
    fieldErrors.suburb = "Enter your suburb (e.g. Glenfield), not the city.";
  }

  // Required here (not at initial signup — see apply/route.ts, where the
  // short first-touch form never collects it). By the time a merchant is
  // back in the portal editing their profile, the field is on screen and
  // customers rely on it to know what the business actually does.
  // Home-based or mobile: the address above stays private, and the
  // listing shows the suburb and the area they cover instead.
  // "Hide my address" (home-based, or doesn't want it shown): the public
  // sees the suburb and "address provided when you book". Areas covered,
  // for a business that goes to its customers, are shown if given.
  const hideAddress = body.hideAddress === true;
  const serviceArea = cleanText(body.serviceArea, 200);

  const bio = cleanText(body.bio, MAX_BIO_LENGTH);
  if (bio.length < MIN_BIO_LENGTH) {
    fieldErrors.bio = `At least ${MIN_BIO_LENGTH} characters needed (currently ${bio.length}).`;
  }

  const nzbn = normalizeNzbn(body.nzbn);
  if (!isValidNzbnFormat(nzbn)) fieldErrors.nzbn = "NZBN must be 13 digits.";

  const priceRange = cleanText(body.priceRange, 4);
  if (!ALLOWED_PRICE_RANGES.includes(priceRange)) fieldErrors.priceRange = "Invalid price range.";

  // No longer collected by the profile form — a business chooses category
  // per deal instead (app/portal/new-deal/NewDealForm.tsx), not once for
  // the whole listing. Kept optional-but-validated, same as the apply
  // route, so older records that still carry one aren't rejected or
  // silently cleared by a save that doesn't mention it.
  const category = cleanText(body.category, MAX_TEXT_LENGTH);
  if (category && !isBusinessCategory(category)) {
    fieldErrors.category = "Please select a business category.";
  }

  const bookingEmail = cleanText(body.bookingEmail, MAX_TEXT_LENGTH);
  if (bookingEmail && !EMAIL_RE.test(bookingEmail)) fieldErrors.bookingEmail = "Enter a valid booking email.";

  const website = cleanText(body.website, MAX_TEXT_LENGTH);
  if (!isSafeOptionalUrl(website)) fieldErrors.website = "Enter a valid website address.";
  const bookingUrl = cleanText(body.bookingUrl, MAX_TEXT_LENGTH);
  if (!isSafeOptionalUrl(bookingUrl)) fieldErrors.bookingUrl = "Enter a valid booking link.";

  const facebookUrl = cleanText(body.facebookUrl, MAX_TEXT_LENGTH);
  if (!isValidSocialUrl(facebookUrl, "facebook")) {
    fieldErrors.facebookUrl = "Enter a valid Facebook page URL (e.g. facebook.com/yourbusiness).";
  }
  const instagramUrl = cleanText(body.instagramUrl, MAX_TEXT_LENGTH);
  if (!isValidSocialUrl(instagramUrl, "instagram")) {
    fieldErrors.instagramUrl = "Enter a valid Instagram profile URL (e.g. instagram.com/yourbusiness).";
  }

  // The main customer button: one of the methods given here, or none
  // (MegaDeal's order). Left alone if not sent.
  const preferredContact =
    body.preferredContact === undefined ? undefined : isContactMethod(body.preferredContact) ? body.preferredContact : null;
  if (preferredContact && !availableMethods({ phone, bookingUrl, website, email: bookingEmail }).includes(preferredContact)) {
    fieldErrors.preferredContact = "Choose the main button from the contact details you've added.";
  }

  // Checked before they're stored (T243): never kept, or shown, unreadable.
  const hoursProblem = businessHoursError(body.businessHours);
  if (hoursProblem) fieldErrors.businessHours = hoursProblem;
  if (Object.keys(fieldErrors).length > 0) {
    const messages = Object.values(fieldErrors);
    return NextResponse.json(
      {
        error:
          messages.length === 1
            ? messages[0]
            : `Please fix ${messages.length} fields: ${messages.join(" ")}`,
        fields: fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
  const adminClient = createDataClient();
  const merchant = await getOrClaimMerchant(adminClient, member);
  if (!merchant) {
    return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
  }

  const addressChanged = address !== (merchant.address || "") || city !== (merchant.city || "");
  // This form now has the same address-autocomplete/pin-map as signup, so a
  // freshly resolved lat/lng from the client is trustworthy — use it. If
  // the client didn't send one (address typed without picking a
  // suggestion) and the address changed, drop the old coordinates rather
  // than show a map pin at the wrong location; if the address is unchanged,
  // leave whatever was already stored alone.
  const lat = Number.isFinite(body.lat) ? Number(body.lat) : null;
  const lng = Number.isFinite(body.lng) ? Number(body.lng) : null;

  // An approved business's new About text, links, booking email or phone
  // are checked first (security pack T161, lib/profileReview.ts): clean
  // ones go live, anything else waits for an admin while customers keep
  // seeing the previous version.
  const reviewed = { bio, website, bookingUrl, bookingEmail, phone, facebookUrl, instagramUrl };
  const changes = merchant.status === "Approved" ? profileChanges(merchant, reviewed) : {};
  const decision = Object.keys(changes).length ? await reviewProfileChanges(adminClient, merchant, changes) : null;
  const held = decision?.hold ? changes : null;
  const kept = held ? Object.fromEntries(Object.keys(held).map((f) => [f, merchant[f] ?? ""])) : {};

  let updated = await adminClient.items.update("Merchants", {
    ...merchant,
    businessName,
    contactName,
    contactPhone,
    legalBusinessName,
    nzbn,
    website,
    phone,
    address,
    city,
    // The form no longer sends this, so an empty client value must not
    // clobber whatever a merchant had from before it was removed.
    category: category || merchant.category || "",
    suburb,
    hideAddress,
    serviceArea,
    postcode: cleanText(body.postcode, 20),
    bio,
    businessHours: cleanText(body.businessHours, MAX_BUSINESS_HOURS_LENGTH),
    bookingUrl,
    bookingEmail,
    // The answer new deals start with ("Do customers usually need to
    // book?"); "" means ask each time. Left alone if not sent.
    defaultBookingRequirement:
      body.defaultBookingRequirement === undefined
        ? merchant.defaultBookingRequirement ?? ""
        : isBookingChoice(body.defaultBookingRequirement)
          ? body.defaultBookingRequirement
          : "",
    preferredContact: preferredContact === undefined ? merchant.preferredContact ?? null : preferredContact,
    facebookUrl,
    instagramUrl,
    priceRange,
    amenities: cleanText(body.amenities, MAX_TEXT_LENGTH),
    lat: lat ?? (addressChanged ? null : merchant.lat ?? null),
    lng: lng ?? (addressChanged ? null : merchant.lng ?? null),
    status: statusAfterMerchantEdit(merchant, {
      businessName,
      legalBusinessName,
      nzbn,
      category: category || merchant.category || "",
    }),
    // Keep this in sync with Wix's real verified-email flag rather than
    // letting it go stale between visits.
    emailVerified: member.loginEmailVerified,
    // Held changes: the live values stay, the new ones wait. A save that
    // goes live clears anything waiting (it was saved over).
    ...kept,
    pendingProfile: held,
    pendingProfileReview: held ? { reason: decision!.reason, review: decision!.review, at: new Date().toISOString() } : null,
    pendingProfileAt: held ? new Date().toISOString() : null,
  });
  if (held && !updated.pendingProfile) {
    // Before the database update adding pending_profile is applied there's
    // nowhere to hold them: saved as before rather than lost.
    console.error("[merchants/profile] pending_profile isn't in the database yet (Admin > System); saved the changes directly");
    updated = await adminClient.items.update("Merchants", { ...updated, ...held });
  }
  if (decision) await emailProfileChange(merchant, changes, held ? { reason: decision.reason ?? "" } : null);
  // New hours, phone or address on the public business page.
  notifyBusinessChanged(updated);
  return NextResponse.json({
    item: merchantForBusiness(updated),
    // What's waiting for a check, for the form to say.
    held: held && updated.pendingProfile ? Object.keys(held).map((f) => PROFILE_FIELD_LABELS[f as ReviewedField]) : [],
  });
  } catch (err) {
    console.error("[merchants/profile] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
