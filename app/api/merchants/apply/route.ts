import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { getOrClaimMerchant } from "@/lib/merchant";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { insertEmailSignup } from "@/lib/emailSignups";
import { SITE_URL } from "@/lib/siteConfig";
import { generateReferralCode } from "@/lib/referral";
import { isValidSocialUrl, isSafeOptionalUrl } from "@/lib/socialLinks";
import { isValidNzbnFormat, normalizeNzbn } from "@/lib/nzbn";
import { isBusinessCategory } from "@/lib/categories";
import { escapeHtml } from "@/lib/escapeHtml";
import { brandedEmailHtml } from "@/lib/emailTemplate";

const MAX_TEXT_LENGTH = 300;
// businessHours holds a serialized structured-hours JSON blob (7 days,
// each with any number of time ranges, plus a notes string) — far longer
// than a normal single-line field, so it gets its own generous cap rather
// than MAX_TEXT_LENGTH silently truncating it into invalid JSON.
const MAX_BUSINESS_HOURS_LENGTH = 4000;
const MAX_BIO_LENGTH = 600;
const ALLOWED_PRICE_RANGES = ["", "$", "$$", "$$$", "$$$$"];

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function welcomeEmailHtml(businessName: string): string {
  const safeName = escapeHtml(businessName);
  return brandedEmailHtml(`
        <p style="margin:0 0 16px;">Hi ${safeName || "there"},</p>
        <p style="margin:0 0 16px;">🎉 You're in! Thanks for signing up to MegaDeal — we're genuinely excited to have ${safeName || "your business"} on board.</p>
        <p style="margin:0 0 8px;">Here's what happens next:</p>
        <ul style="margin:0 0 16px;padding-left:20px;">
          <li style="margin-bottom:6px;">Our team will take a look at your application — usually within a couple of business days</li>
          <li style="margin-bottom:6px;">Once you're approved, you'll have deal credits waiting in your portal, ready to list your first deal straight away</li>
          <li>From there it's simple: you set the offer, we bring the customers, and you keep every dollar</li>
        </ul>
        <p style="margin:0 0 16px;">You can check your application status, manage your profile, and keep an eye on your credits anytime from your <a href="${SITE_URL}/portal" style="color:#7a17f0;font-weight:700;">business portal</a>.</p>
        <p style="margin:0 0 16px;">If anything's unclear, or you just want to say hi, hit reply — a real person reads every message.</p>
        <p style="margin:0 0 16px;">Thanks for giving MegaDeal a go — welcome to the herd. 🐘</p>
        <p style="margin:0;">— The MegaDeal team</p>
  `);
}

/**
 * Creates or updates the signed-in member's business application. Requires
 * an account now (see app/list-your-business/MerchantSignupForm.tsx — signup and
 * application are one flow, the account is created first via Wix's own
 * Custom Login register()), rather than the old "apply first, claim later"
 * design. getOrClaimMerchant still runs first so this can't create a
 * duplicate record for someone who applied under the old flow before this
 * account is linked to it.
 */
export async function POST(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (await memberRateLimited("merchant-apply", member.id, 10, HOUR)) {
    return NextResponse.json(
      { error: "You've submitted that a lot in a short time. Please try again shortly." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a real visitor never fills this hidden field in. A bot
  // filling every input on the form will. Pretend to succeed either way so
  // we don't tip a bot off that it was caught.
  // (Field renamed from "website2" — Chrome autofilled that one for real
  // visitors, so genuine applications were being silently discarded here.)
  if (typeof body.mg_contact_ref === "string" && body.mg_contact_ref.trim() !== "") {
    return NextResponse.json({ item: { _id: "ok" } });
  }

  // Collected rather than returned as soon as one fails, so an applicant
  // missing several fields sees all of them at once instead of fixing one,
  // resubmitting, and being told about the next.
  const fieldErrors: Record<string, string> = {};

  const businessName = cleanText(body.businessName, MAX_TEXT_LENGTH);
  if (!businessName) fieldErrors.businessName = "Business name is required.";
  const contactName = cleanText(body.contactName, MAX_TEXT_LENGTH);
  if (!contactName) fieldErrors.contactName = "Contact name is required.";
  const contactPhone = cleanText(body.contactPhone, MAX_TEXT_LENGTH);
  if (!contactPhone) fieldErrors.contactPhone = "Contact phone is required.";
  const legalBusinessName = cleanText(body.legalBusinessName, MAX_TEXT_LENGTH);
  if (!legalBusinessName) fieldErrors.legalBusinessName = "Legal business name is required.";
  const phone = cleanText(body.phone, MAX_TEXT_LENGTH);
  if (!phone) fieldErrors.phone = "Phone is required.";

  // Address and city are deferred to the portal's "complete your profile"
  // step (same pattern as bio/hours/website/social below) — the initial
  // signup only needs enough to create the account and start a review,
  // not the full public-listing details yet.
  const address = cleanText(body.address, MAX_TEXT_LENGTH);
  const city = cleanText(body.city, MAX_TEXT_LENGTH);

  const nzbn = normalizeNzbn(body.nzbn);
  if (!isValidNzbnFormat(nzbn)) fieldErrors.nzbn = "NZBN must be 13 digits.";

  const priceRange = cleanText(body.priceRange, 4);
  if (!ALLOWED_PRICE_RANGES.includes(priceRange)) fieldErrors.priceRange = "Invalid price range.";

  // The portal's "finish your signup" form posts here, and it asks for a
  // category — but this route never read one, so it was dropped on the
  // floor. The portal then decides the listing is complete from address
  // AND category, so the merchant could submit a full, correct form as
  // many times as they liked and still be told to finish their listing,
  // with nothing on screen explaining why. Optional here because the
  // original short signup form didn't collect it and older records
  // predate it; validated whenever one is actually supplied.
  const category = cleanText(body.category, MAX_TEXT_LENGTH);
  if (category && !isBusinessCategory(category)) {
    fieldErrors.category = "Please select a business category.";
  }

  const bookingEmail = cleanText(body.bookingEmail, MAX_TEXT_LENGTH);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

  if (body.agreedToTerms !== true) {
    fieldErrors.agreedToTerms = "You must agree to the Terms and Conditions to apply.";
  }

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

  const lat = Number.isFinite(body.lat) ? Number(body.lat) : null;
  const lng = Number.isFinite(body.lng) ? Number(body.lng) : null;

  let item: any;
  let isNewApplication = true;
  try {
    const adminClient = createWixAdminClient();
    const existing = await getOrClaimMerchant(adminClient, member);

    const fields = {
      businessName,
      contactName,
      contactPhone,
      legalBusinessName,
      nzbn,
      email: member.email ?? "",
      phone,
      address,
      city,
      category,
      postcode: cleanText(body.postcode, 20),
      website,
      bio: cleanText(body.bio, MAX_BIO_LENGTH),
      businessHours: cleanText(body.businessHours, MAX_BUSINESS_HOURS_LENGTH),
      bookingUrl,
      bookingEmail,
      facebookUrl,
      instagramUrl,
      priceRange,
      amenities: cleanText(body.amenities, MAX_TEXT_LENGTH),
      lat,
      lng,
      // Real Wix-verified status, not a token we invented — kept in sync
      // here and in /api/merchants/profile so the admin dashboard's
      // merchant list (which reads this Wix Data field, not a live Members
      // lookup) stays accurate.
      emailVerified: member.loginEmailVerified,
    };

    if (existing) {
      isNewApplication = false;
      item = await adminClient.items.update("Merchants", {
        ...existing,
        ...fields,
        // Since category is optional above, a submission that omits it
        // must not blank out one already on the record — this route
        // spreads fields over the whole existing item, so an empty string
        // would otherwise overwrite a good value and knock the listing
        // back to incomplete.
        category: category || existing.category || "",
        // Same convention as /api/merchants/profile: resubmitting details
        // sends it back for review, same as any other edit would.
        status: "Pending",
      });
    } else {
      item = await adminClient.items.insert("Merchants", {
        ...fields,
        couponCode: cleanText(body.couponCode, 50),
        creditsBalance: 0,
        status: "Pending",
        logoUrl: "",
        referralCode: generateReferralCode(),
        referralRewarded: false,
        _owner: member.id,
      });
    }
  } catch (err) {
    console.error("[merchants/apply] failed to save application", err);
    return NextResponse.json(
      { error: "Something went wrong submitting your application. Please try again." },
      { status: 500 }
    );
  }

  // Best-effort, same reasoning as before: neither of these should block
  // the application itself if they hiccup.
  if (isNewApplication && member.email) {
    sendTransactionalEmail({
      to: member.email,
      subject: `Welcome to MegaDeal, ${businessName}! 🎉`,
      html: welcomeEmailHtml(businessName),
      // The copy above says "hit reply" — without this, "from" is a
      // fixed no-reply@ mailbox and any reply just bounces.
      replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
    }).catch((err) => console.error("[merchants/apply] welcome email failed", err));

    // Verified true immediately — this email already belongs to a signed-in
    // Wix member with a verified account, unlike the anonymous customer
    // double-opt-in flow, so there's nothing left to confirm.
    insertEmailSignup({
      email: member.email,
      audience: "merchant",
      source: "merchant-signup",
      verified: true,
    }).catch((err) => console.error("[merchants/apply] EmailSignups sync failed", err));
  }

  return NextResponse.json({ item });
}
