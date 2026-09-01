import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { getOrClaimMerchant } from "@/lib/merchant";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { addResendContact } from "@/lib/resendAudience";
import { SITE_URL } from "@/lib/siteConfig";
import { generateReferralCode } from "@/lib/referral";
import { isValidSocialUrl } from "@/lib/socialLinks";

const MAX_TEXT_LENGTH = 300;
const MAX_BIO_LENGTH = 600;
const ALLOWED_PRICE_RANGES = ["", "$", "$$", "$$$", "$$$$"];

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function welcomeEmailHtml(businessName: string): string {
  return `
    <p>Hi ${businessName || "there"},</p>
    <p>🎉 You're in! Thanks for signing up to MegaDeal — we're genuinely excited to have ${businessName || "your business"} on board.</p>
    <p>Here's what happens next:</p>
    <ul>
      <li>Our team will take a look at your application — usually within a couple of business days</li>
      <li>Once you're approved, you'll have deal credits waiting in your portal, ready to list your first deal straight away</li>
      <li>From there it's simple: you set the offer, we bring the customers, and you keep every dollar</li>
    </ul>
    <p>You can check your application status, manage your profile, and keep an eye on your credits anytime from your <a href="${SITE_URL}/portal">business portal</a>.</p>
    <p>If anything's unclear, or you just want to say hi, hit reply — a real person reads every message.</p>
    <p>Thanks for giving MegaDeal a go — welcome to the herd. 🐘</p>
    <p>— The MegaDeal team</p>
  `;
}

/**
 * Creates or updates the signed-in member's business application. Requires
 * an account now (see app/businesses/MerchantSignupForm.tsx — signup and
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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a real visitor never fills this hidden field in. A bot
  // filling every input on the form will. Pretend to succeed either way so
  // we don't tip a bot off that it was caught.
  if (typeof body.website2 === "string" && body.website2.trim() !== "") {
    return NextResponse.json({ item: { _id: "ok" } });
  }

  const businessName = cleanText(body.businessName, MAX_TEXT_LENGTH);
  const phone = cleanText(body.phone, MAX_TEXT_LENGTH);
  const address = cleanText(body.address, MAX_TEXT_LENGTH);
  const city = cleanText(body.city, MAX_TEXT_LENGTH);

  if (!businessName || !phone || !address || !city) {
    return NextResponse.json(
      { error: "Business name, phone, address and city are required." },
      { status: 400 }
    );
  }

  const priceRange = cleanText(body.priceRange, 4);
  if (!ALLOWED_PRICE_RANGES.includes(priceRange)) {
    return NextResponse.json({ error: "Invalid price range." }, { status: 400 });
  }

  const bookingEmail = cleanText(body.bookingEmail, MAX_TEXT_LENGTH);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (bookingEmail && !EMAIL_RE.test(bookingEmail)) {
    return NextResponse.json({ error: "Enter a valid booking email." }, { status: 400 });
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

  if (body.agreedToTerms !== true) {
    return NextResponse.json(
      { error: "You must agree to the Terms and Conditions to apply." },
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
      email: member.email ?? "",
      phone,
      address,
      city,
      postcode: cleanText(body.postcode, 20),
      website: cleanText(body.website, MAX_TEXT_LENGTH),
      bio: cleanText(body.bio, MAX_BIO_LENGTH),
      businessHours: cleanText(body.businessHours, MAX_TEXT_LENGTH),
      bookingUrl: cleanText(body.bookingUrl, MAX_TEXT_LENGTH),
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
    }).catch((err) => console.error("[merchants/apply] welcome email failed", err));

    addResendContact(member.email).catch((err) =>
      console.error("[merchants/apply] Resend sync failed", err)
    );
  }

  return NextResponse.json({ item });
}
