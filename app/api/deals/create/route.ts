import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";

const MAX_PHOTO_LENGTH = 350_000;
const MAX_DURATION_DAYS = 365;

/**
 * Merchant-facing deal creation. Only reachable by a signed-in member with
 * an approved-or-pending business record and at least 1 credit — both
 * checked here server-side against the caller's verified identity, not
 * anything the client claims, so nobody can submit a deal "as" another
 * merchant or without a credit to spend.
 */
export async function POST(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const dealName = String(body.dealName || "").trim();
  const description = String(body.description || "").trim();
  const terms = String(body.terms || "").trim();
  const priceNow = Number(body.priceNow);
  const priceWas = body.priceWas !== undefined && body.priceWas !== "" ? Number(body.priceWas) : undefined;
  const durationDays = Number(body.durationDays);
  const quantityAvailable =
    body.quantityAvailable !== undefined && body.quantityAvailable !== ""
      ? Number(body.quantityAvailable)
      : undefined;
  const photoUrl = body.photoUrl ? String(body.photoUrl) : "";

  if (!dealName || !description || !terms) {
    return NextResponse.json({ error: "Deal name, description and terms are required." }, { status: 400 });
  }
  if (!Number.isFinite(priceNow) || priceNow <= 0) {
    return NextResponse.json({ error: "Enter a valid deal price." }, { status: 400 });
  }
  if (priceWas !== undefined && (!Number.isFinite(priceWas) || priceWas < priceNow)) {
    return NextResponse.json({ error: "Original price must be at least the deal price." }, { status: 400 });
  }
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > MAX_DURATION_DAYS) {
    return NextResponse.json({ error: "Choose a valid duration." }, { status: 400 });
  }
  if (quantityAvailable !== undefined && (!Number.isFinite(quantityAvailable) || quantityAvailable < 1)) {
    return NextResponse.json({ error: "Quantity available must be a positive number." }, { status: 400 });
  }
  if (photoUrl && (!photoUrl.startsWith("data:image/") || photoUrl.length > MAX_PHOTO_LENGTH)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  const adminClient = createWixAdminClient();

  const merchantResult = await adminClient.items.query("Merchants").eq("_owner", member.id).find();
  const merchant = merchantResult.items?.[0];
  if (!merchant) {
    return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
  }
  if (merchant.status === "Suspended") {
    return NextResponse.json({ error: "Your account is suspended. Contact us for help." }, { status: 403 });
  }
  const credits = Number(merchant.creditsBalance) || 0;
  if (credits < 1) {
    return NextResponse.json({ error: "You don't have any deal credits left. Contact us to top up." }, { status: 403 });
  }

  const expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString();

  const deal = await adminClient.items.insert("Deals", {
    dealName,
    description,
    terms,
    priceNow,
    priceWas: priceWas ?? priceNow,
    quantityAvailable: quantityAvailable ?? null,
    photoUrl,
    expiresAt,
    merchantEmail: member.email,
    status: "Pending Approval",
    productId: "",
  });

  await adminClient.items.update("Merchants", {
    ...merchant,
    creditsBalance: credits - 1,
  });

  return NextResponse.json({ item: deal });
}
