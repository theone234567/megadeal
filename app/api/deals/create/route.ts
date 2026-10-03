import { NextRequest, NextResponse } from "next/server";
import { bookingConflict, hasUsableBookingRoute, isBookingChoice } from "@/lib/booking";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { isWixMediaUrl } from "@/lib/photoUrl";
import { CATEGORY_ID_BY_NAME } from "@/lib/categories";
import { getOrClaimMerchant } from "@/lib/merchant";
import { debitCreditsIfAvailable, incrementCreditsAtomically, setFieldsIf } from "@/lib/creditsAtomic";
import { getPlatformSettings } from "@/lib/platformSettings";
import {
  creditsLabel,
  dealCreditCost,
  dealTypeBlocked,
  dealTypeName,
  maxRequestedDuration,
} from "@/lib/platformSettingsRules";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { dealCodeError, generateDealCode, normaliseDealCode } from "@/lib/dealCode";
import { reviewSubmittedDeal } from "@/lib/aiReviewApply";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import { durationError, toRequestedMinutes } from "@/lib/dealDuration";

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

  if (await memberRateLimited("deal-create", member.id, 20, HOUR)) {
    return NextResponse.json(
      { error: "You've submitted a lot of deals at once. Please try again shortly." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // The platform settings (admin dashboard → Platform settings): which deal
  // types are open, how long they can run, what they cost. If they can't
  // be read, nothing is submitted rather than guessing at them.
  let settings;
  try {
    settings = (await getPlatformSettings()).settings;
  } catch (err) {
    console.error("[deals/create] platform settings unavailable", err);
    return NextResponse.json(
      { error: "We couldn't check the deal settings just now. Please try again in a moment." },
      { status: 503 }
    );
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
  // Optional: a code the business chose. Blank means we generate one.
  const customDealCode = normaliseDealCode(body.dealCode);
  const categoryId = CATEGORY_ID_BY_NAME[category];

  // Wix Stores caps product names at 80 characters; past that the product
  // create failed and the business saw only "Couldn't create your deal".
  if (dealName.length > 80) {
    return NextResponse.json({ error: "Keep the deal name to 80 characters or fewer." }, { status: 400 });
  }
  if (description.length > 5000 || terms.length > 2000) {
    return NextResponse.json({ error: "The description or conditions are too long." }, { status: 400 });
  }
  if (customDealCode) {
    const codeError = dealCodeError(customDealCode);
    if (codeError) return NextResponse.json({ error: `Deal code: ${codeError}` }, { status: 400 });
  }
  if (!dealName || !description || !terms) {
    return NextResponse.json({ error: "Deal name, description and terms are required." }, { status: 400 });
  }
  // Explicit on every new submission (lib/booking.ts): the public page
  // never guesses "no booking needed" from a missing link or an unticked
  // box, so the merchant has to say.
  const bookingRequirement = body.bookingRequirement;
  if (!isBookingChoice(bookingRequirement)) {
    return NextResponse.json({ error: "Choose whether customers need to book." }, { status: 400 });
  }
  const conflict = bookingConflict(bookingRequirement, terms);
  if (conflict) {
    return NextResponse.json({ error: conflict }, { status: 400 });
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
  const typeBlocked = dealTypeBlocked(isFlash, settings);
  if (typeBlocked) {
    return NextResponse.json({ error: `${typeBlocked} Save this deal as a draft for now.` }, { status: 403 });
  }
  // Flash up to 6 hours, Everyday up to 30 days (lib/dealDuration.ts), or
  // less if an admin has set a shorter maximum.
  const durationProblem = durationError(
    isFlash,
    isFlash ? durationMinutes : durationDays,
    maxRequestedDuration(isFlash, settings)
  );
  if (durationProblem) {
    return NextResponse.json({ error: durationProblem }, { status: 400 });
  }
  if (quantityAvailable !== undefined && (!Number.isInteger(quantityAvailable) || quantityAvailable < 1)) {
    return NextResponse.json({ error: "Quantity available must be a positive number." }, { status: 400 });
  }
  // A deal without a photo is close to unsellable on a grid of deals that
  // all have one, and it drags down the cards either side of it. Enforced
  // here rather than only in the form because this route is the boundary:
  // the form's own check tells the merchant which field is missing, this
  // one is what makes it true.
  if (!photoUrl) {
    return NextResponse.json({ error: "Add a photo of your deal." }, { status: 400 });
  }
  if (!isWixMediaUrl(photoUrl)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  // Set once credits are taken or a draft is claimed, cleared once the
  // deal exists: if anything throws in between, the catch below gives the
  // credits back and returns the draft to Draft.
  let undoSubmission: (() => Promise<void>) | null = null;
  try {
  const adminClient = createWixAdminClient();

  const merchant = await getOrClaimMerchant(adminClient, member);
  if (!merchant) {
    return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
  }
  if (merchant.status === "Suspended") {
    return NextResponse.json({ error: "Your account is suspended. Contact us for help." }, { status: 403 });
  }
  // Before launch deals are built and saved as drafts only (the form does
  // the same); this stops a submission reaching review from anywhere else.
  if (!SITE_LAUNCHED) {
    return NextResponse.json(
      { error: "MegaDeal hasn't launched yet. Save this deal as a draft and submit it once we go live." },
      { status: 403 }
    );
  }
  // Only a business an admin has approved can submit deals. A new signup
  // can build and save drafts, and submit them once approved.
  if (merchant.status !== "Approved") {
    return NextResponse.json(
      { error: "We're still reviewing your business. Save this deal as a draft and submit it once you're approved." },
      { status: 403 }
    );
  }
  if (!settings.acceptSubmissions) {
    return NextResponse.json(
      { error: "New deal submissions are paused at the moment. Save this deal as a draft and submit it later." },
      { status: 403 }
    );
  }
  // A deal that requires booking must give customers a way to book.
  if (
    bookingRequirement === "required" &&
    !hasUsableBookingRoute({
      bookingUrl: merchant.bookingUrl || null,
      phone: merchant.phone || null,
      bookingEmail: merchant.bookingEmail || null,
    })
  ) {
    return NextResponse.json(
      {
        error:
          "This deal needs a booking, but your profile has no booking link, phone number or booking email. Add one in your profile first.",
      },
      { status: 400 }
    );
  }
  // What this deal costs now (Everyday 4, Flash 1 by default; 0 when
  // charging is off). Recorded on the deal, so a refund returns exactly
  // what was taken even if the costs change later.
  const cost = dealCreditCost(isFlash, settings);
  const credits = Number(merchant.creditsBalance) || 0;
  if (credits < cost) {
    return NextResponse.json(
      {
        error: `${dealTypeName(isFlash).replace(/^./, (c) => c.toUpperCase())}s cost ${creditsLabel(cost)} and you have ${credits} credit${credits === 1 ? "" : "s"}. Contact us to top up.`,
      },
      { status: 403 }
    );
  }

  // Resolved before anything is created, so a bad draft id fails while
  // nothing has happened yet — no orphaned product, no spent credit.
  let draftRow: any = null;
  const draftId = typeof body.draftId === "string" ? body.draftId : null;
  if (draftId) {
    draftRow = await adminClient.items.get("Deals", draftId);
    if (!draftRow) {
      return NextResponse.json({ error: "That draft no longer exists." }, { status: 404 });
    }
    if ((draftRow.merchantEmail || "").toLowerCase() !== member.email.toLowerCase()) {
      return NextResponse.json({ error: "This isn't your draft." }, { status: 403 });
    }
    // Without this, passing a Live deal's id would rewrite it wholesale
    // and send it back through approval, spending a credit to do so.
    if (draftRow.status !== "Draft") {
      return NextResponse.json(
        { error: "That deal has already been submitted." },
        { status: 409 }
      );
    }
  }

  // Claim the draft: only one request can move it out of Draft, so a
  // double tap or a second tab can't submit (and charge for) it twice.
  if (draftRow) {
    const claimed = await setFieldsIf(
      adminClient,
      "Deals",
      draftRow._id,
      { status: "Pending Approval" },
      { status: { $eq: "Draft" } }
    );
    if (!claimed) {
      return NextResponse.json({ error: "That deal has already been submitted." }, { status: 409 });
    }
  }
  const releaseDraft = async () => {
    if (!draftRow) return;
    const back = await setFieldsIf(
      adminClient,
      "Deals",
      draftRow._id,
      { status: "Draft" },
      { status: { $eq: "Pending Approval" } }
    );
    if (!back) console.error(`[deals/create] draft ${draftRow._id} couldn't be returned to Draft`);
  };

  // Take the credits before creating anything, in one step that also
  // checks the balance covers them (the check above is only for a quick,
  // friendly answer): two submissions at once can't overdraw the wallet.
  if (cost > 0) {
    const debit = await debitCreditsIfAvailable(adminClient, merchant._id, cost);
    if (debit !== "debited") {
      await releaseDraft();
      return NextResponse.json(
        debit === "insufficient"
          ? { error: `${dealTypeName(isFlash)}s cost ${creditsLabel(cost)} and you don't have enough credits left. Contact us to top up.` }
          : { error: "We couldn't take the credits just now. Nothing was charged. Please try again in a moment." },
        { status: debit === "insufficient" ? 403 : 503 }
      );
    }
  }
  undoSubmission = async () => {
    if (cost > 0) {
      const back = await incrementCreditsAtomically(adminClient, merchant._id, cost);
      if (!back) console.error(`[deals/create] CREDITS NOT RETURNED (${cost}) to merchant ${merchant._id} after a failed submission`);
    }
    await releaseDraft();
  };

  // Create the Wix Store product first — if this fails, the credits go
  // back and the draft returns to Draft, so the merchant can just retry.
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
    await undoSubmission();
    undoSubmission = null;
    return NextResponse.json(
      { error: "Couldn't create your deal listing. Please try again or contact us." },
      { status: 502 }
    );
  }
  const productJson = await productRes.json();
  const productId = productJson?.product?.id;
  if (!productId) {
    await undoSubmission();
    undoSubmission = null;
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

  // The clock doesn't start until the deal first goes live — review time
  // mustn't use up the listing. The requested run is stored and turned
  // into an end date at publication (firstPublicationFields).
  const requestedDurationMinutes = toRequestedMinutes(isFlash, isFlash ? durationMinutes : durationDays);

  const fields = {
    dealName,
    description,
    terms,
    priceNow,
    priceWas: priceWas ?? priceNow,
    quantityAvailable: quantityAvailable ?? null,
    photoUrl,
    expiresAt: null,
    requestedDurationMinutes,
    merchantEmail: member.email,
    status: "Pending Approval",
    productId,
    isFlash,
    bookingRequirement,
    dealCode: customDealCode || generateDealCode(),
    creditsCharged: cost,
    // The editing copies have served their purpose. Leaving draftData
    // behind would mean a submitted deal carrying a stale second version
    // of itself; leaving the statusNote supplement behind would put
    // machine text in the field an admin uses to explain a rejection.
    draftData: "",
    statusNote: "",
  };

  // Submitting a draft promotes that row rather than inserting a second
  // one — otherwise the merchant would watch their deal go off for review
  // while the draft it came from sat in the portal beside it, looking
  // unsubmitted.
  let deal;
  try {
    deal = draftRow
      ? await adminClient.items.update("Deals", { ...draftRow, ...fields })
      : await adminClient.items.insert("Deals", fields);
  } catch (err) {
    // The Stores product already exists at this point. Leaving it behind
    // used to publish it: a product with no Deals row reads as a deal with
    // no status, and isDealLive treats that as live — so a failure here
    // put an unapproved, ownerless deal on the site. The listing now
    // ignores such products, and this removes them as well, so a failed
    // submission leaves nothing behind at all.
    console.error("[deals/create] deal row write failed, removing orphaned product", err);
    try {
      await adminClient.fetchWithAuth(
        `https://www.wixapis.com/stores/v3/products/${productId}`,
        { method: "DELETE" }
      );
    } catch (cleanupErr) {
      console.error("[deals/create] orphaned product cleanup failed", cleanupErr);
    }
    await undoSubmission();
    undoSubmission = null;
    return NextResponse.json(
      { error: "Couldn't save your deal. Nothing was charged. Please try again." },
      { status: 500 }
    );
  }

  // Past this point the submission has succeeded: the deal exists, is in
  // review and has been paid for. What follows is bookkeeping, and a
  // failure in it must not become a 500 or undo the charge: the merchant
  // would be told to try again and end up paying twice for one deal.
  undoSubmission = null;

  try {
    await logMerchantActivity(adminClient, {
      merchantEmail: member.email,
      type: "credit",
      // Only claim the charge that actually happened. A minus line against
      // an unchanged balance is worse than no line: it sends the merchant
      // looking for credits that were never taken.
      amount: -cost,
      description: `${dealTypeName(isFlash)} submitted: "${dealName}"${cost === 0 ? " (no credits charged)" : ""}`,
    });
  } catch (err) {
    console.error("[deals/create] activity log failed", err);
  }

  // First-pass review. A clean deal from an approved business goes live
  // now; clearly offensive content is turned down with the reason (and the
  // credit back); everything else waits for a person, as before. Bounded
  // by a timeout and never throws — at worst the deal just stays pending.
  // With "every deal waits for admin approval" on, the AI review may still
  // turn down a clearly unsuitable deal but never publishes one.
  const review = await reviewSubmittedDeal(
    adminClient,
    deal,
    merchant,
    { category, apply: settings.requireApproval ? "noPublish" : true }
  );

  return NextResponse.json({
    item: review.item,
    outcome: review.outcome === "publish" ? "live" : review.outcome === "reject" ? "rejected" : "pending",
    message: review.outcome === "reject" ? review.item.statusNote ?? null : null,
    // What a turned-down deal gave back: what it was charged.
    creditsReturned: review.outcome === "reject" && review.creditsReturned ? review.creditsReturned : 0,
  });
  } catch (err) {
    console.error("[deals/create] failed", err);
    if (undoSubmission) {
      await undoSubmission().catch((undoErr) => console.error("[deals/create] undo failed", undoErr));
      return NextResponse.json({ error: "Something went wrong. Nothing was charged. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
