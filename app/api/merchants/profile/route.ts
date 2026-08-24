import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";

const MAX_TEXT_LENGTH = 300;
const MAX_BIO_LENGTH = 600;

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

  const adminClient = createWixAdminClient();
  const result = await adminClient.items.query("Merchants").eq("_owner", member.id).find();
  const merchant = result.items?.[0];
  if (!merchant) {
    return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
  }

  const updated = await adminClient.items.update("Merchants", {
    ...merchant,
    businessName,
    website: cleanText(body.website, MAX_TEXT_LENGTH),
    phone: cleanText(body.phone, MAX_TEXT_LENGTH),
    address: cleanText(body.address, MAX_TEXT_LENGTH),
    city: cleanText(body.city, MAX_TEXT_LENGTH),
    postcode: cleanText(body.postcode, 20),
    bio: cleanText(body.bio, MAX_BIO_LENGTH),
    businessHours: cleanText(body.businessHours, MAX_TEXT_LENGTH),
    facebookUrl: cleanText(body.facebookUrl, MAX_TEXT_LENGTH),
    instagramUrl: cleanText(body.instagramUrl, MAX_TEXT_LENGTH),
    status: "Pending",
  });
  return NextResponse.json({ item: updated });
}
