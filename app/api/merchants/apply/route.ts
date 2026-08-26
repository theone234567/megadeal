import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { SITE_URL } from "@/lib/siteConfig";

const MAX_TEXT_LENGTH = 300;
const MAX_BIO_LENGTH = 600;
const ALLOWED_PRICE_RANGES = ["", "$", "$$", "$$$", "$$$$"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/**
 * Public business-application intake — deliberately reachable without
 * signing in, since requiring an account before someone can even tell us
 * about their business is unnecessary friction. The record starts with no
 * `_owner`; it gets linked to the applicant's account automatically the
 * first time they sign in with a matching email (see lib/merchant.ts).
 */
export async function POST(req: NextRequest) {
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
  const email = cleanText(body.email, MAX_TEXT_LENGTH).toLowerCase();
  const phone = cleanText(body.phone, MAX_TEXT_LENGTH);
  const address = cleanText(body.address, MAX_TEXT_LENGTH);
  const city = cleanText(body.city, MAX_TEXT_LENGTH);

  if (!businessName || !phone || !address || !city) {
    return NextResponse.json(
      { error: "Business name, phone, address and city are required." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
  }

  const priceRange = cleanText(body.priceRange, 4);
  if (!ALLOWED_PRICE_RANGES.includes(priceRange)) {
    return NextResponse.json({ error: "Invalid price range." }, { status: 400 });
  }

  const adminClient = createWixAdminClient();
  const emailVerifyToken = randomBytes(32).toString("hex");

  const item = await adminClient.items.insert("Merchants", {
    businessName,
    email,
    phone,
    address,
    city,
    postcode: cleanText(body.postcode, 20),
    website: cleanText(body.website, MAX_TEXT_LENGTH),
    bio: cleanText(body.bio, MAX_BIO_LENGTH),
    businessHours: cleanText(body.businessHours, MAX_TEXT_LENGTH),
    facebookUrl: cleanText(body.facebookUrl, MAX_TEXT_LENGTH),
    instagramUrl: cleanText(body.instagramUrl, MAX_TEXT_LENGTH),
    priceRange,
    amenities: cleanText(body.amenities, MAX_TEXT_LENGTH),
    couponCode: cleanText(body.couponCode, 50),
    creditsBalance: 0,
    status: "Pending",
    logoUrl: "",
    emailVerified: false,
    emailVerifyToken,
  });

  // Best-effort: a failed send shouldn't block the application itself — the
  // record just stays unverified, visible to admins, and can be resolved
  // manually if it ever comes up.
  try {
    const verifyUrl = `${SITE_URL}/api/merchants/verify-email?token=${emailVerifyToken}`;
    await sendTransactionalEmail({
      to: email,
      subject: "Confirm your email for MegaDeal",
      html: `
        <p>Hi ${businessName ? businessName : "there"},</p>
        <p>Thanks for applying to list your business on MegaDeal. Please confirm this is your email address:</p>
        <p><a href="${verifyUrl}">Verify your email</a></p>
        <p>If you didn't apply to MegaDeal, you can ignore this email.</p>
      `,
    });
  } catch (err) {
    console.error("[merchants/apply] verification email failed", err);
  }

  return NextResponse.json({ item });
}
