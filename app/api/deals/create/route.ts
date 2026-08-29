import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { isWixMediaUrl } from "@/lib/photoUrl";
import { CATEGORY_ID_BY_NAME } from "@/lib/categories";
import { getOrClaimMerchant } from "@/lib/merchant";
import { incrementCreditsAtomically } from "@/lib/creditsAtomic";
import { logMerchantActivity } from "@/lib/merchantActivity";

const MAX_DURATION_DAYS = 365;
const MAX_DURATION_MINUTES = 24 * 60;
const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

/**
 * Merchant-facing deal creation. Only reachable by a signed-in member with
 * an approved-or-pending business record and at least 1 credit — both
 * checked here server-side against the caller's verified identity, not
 * anything the client claims, so nobody can submit a deal "as" another
 * merchant or without a credit to spend.
 *
 * This also creates the underlying Wix Store product (with inventory and
 * a category assignment) that the storefront's listing actually reads
 * from — a Deals row with no matching product is invisible on the site no
 * matter its status, so the product must exist for the deal to ever go
 * live once approved.
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
  const isFlash = Boolean(body.isFlash);
  const durationDays = Number(body.durationDays);
  const durationMinutes = Number(body.durationMinutes);
  const quantityAvailable =
    body.quantityAvailable !== undefined && body.quantityAvailable !== ""
      ? Number(body.quantityAvailable)
      : undefined;
  const photoUrl = body.photoUrl ? String(body.photoUrl) : "";
  const photoMediaId = body.photoMediaId ? String(body.photoMediaId) : "";
  const category = String(body.category || "");
  const categoryId = CATEGORY_ID_BY_NAME[category];

  if (!dealName || !description || !terms) {
    return NextResponse.json({ error: "Deal name, description and terms are required." }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "Choose a category." }, { status: 400 });
  }
  if (!Number.isFinite(priceNow) || priceNow <= 0) {
    return NextResponse.json({ error: "Enter a valid deal price." }, { status: 400 });
  }
  if (priceWas !== undefined && (!Number.isFinite(priceWas) || priceWas < priceNow)) {
    return NextResponse.json({ error: "Original price must be at least the deal price." }, { status: 400 });
  }
  if (isFlash) {
    if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
      return NextResponse.json({ error: "Choose a valid flash deal duration." }, { status: 400 });
    }
  } else if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > MAX_DURATION_DAYS) {
    return NextResponse.json({ error: "Choose a valid duration." }, { status: 400 });
  }
  if (quantityAvailable !== undefined && (!Number.isFinite(quantityAvailable) || quantityAvailable < 1)) {
    return NextResponse.json({ error: "Quantity available must be a positive number." }, { status: 400 });
  }
  if (photoUrl && !isWixMediaUrl(photoUrl)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  const adminClient = createWixAdminClient();

  const merchant = await getOrClaimMerchant(adminClient, member);
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

  // Create the Wix Store product first — if this fails, nothing else has
  // happened yet (no Deals row, no credit spent), so it's safe to just
  // return an error and let the merchant retry.
  const productBody: any = {
    product: {
      name: dealName,
      plainDescription: description,
      productType: "PHYSICAL",
      physicalProperties: {},
      variantsInfo: {
        variants: [
          {
            price: {
              actualPrice: { amount: String(priceNow) },
              ...(priceWas !== undefined ? { compareAtPrice: { amount: String(priceWas) } } : {}),
            },
            inventoryItem:
              quantityAvailable !== undefined
                ? { quantity: quantityAvailable }
                : { inStock: true },
          },
        ],
      },
    },
  };
  if (photoMediaId) {
    productBody.product.media = { main: { id: photoMediaId } };
  }

  const productRes = await adminClient.fetchWithAuth(
    "https://www.wixapis.com/stores/v3/products-with-inventory",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productBody),
    }
  );
  if (!productRes.ok) {
    console.error("[deals/create] product creation failed", await productRes.text().catch(() => ""));
    return NextResponse.json(
      { error: "Couldn't create your deal listing. Please try again or contact us." },
      { status: 502 }
    );
  }
  const productJson = await productRes.json();
  const productId = productJson?.product?.id;
  if (!productId) {
    return NextResponse.json(
      { error: "Couldn't create your deal listing. Please try again or contact us." },
      { status: 502 }
    );
  }

  // Category assignment failing shouldn't block the whole submission — the
  // deal would just be missing from that category's browse page, not
  // invisible outright, since the homepage doesn't filter by category.
  try {
    await adminClient.fetchWithAuth(
      "https://www.wixapis.com/categories/v1/bulk/categories/add-item",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: { catalogItemId: productId, appId: WIX_STORES_APP_ID },
          categoryIds: [categoryId],
          treeReference: { appNamespace: "@wix/stores", treeKey: null },
        }),
      }
    );
  } catch (err) {
    console.error("[deals/create] category assignment failed", err);
  }

  const expiresAt = new Date(
    Date.now() + (isFlash ? durationMinutes * 60_000 : durationDays * 86_400_000)
  ).toISOString();

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
    productId,
    isFlash,
  });

  await incrementCreditsAtomically(adminClient, merchant._id, -1);
  await logMerchantActivity(adminClient, {
    merchantEmail: member.email,
    type: "credit",
    amount: -1,
    description: `Deal created: "${dealName}"`,
  });

  return NextResponse.json({ item: deal });
}
