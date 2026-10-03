import { bookingConflict, isBookingChoice, websiteCodeError, type BookingRequirement } from "./booking";
import { CATEGORY_ID_BY_NAME } from "./categories";
import { dealCodeError, normaliseDealCode } from "./dealCode";
import { durationError } from "./dealDuration";

/**
 * The checks on a deal's own fields when it's submitted, in one place:
 * used by /api/deals/create for a business's deal and by the admin's test
 * deals (lib/testDeals.ts), so a test deal is held to exactly the same
 * rules as a real one. Everything about the business (credits, approval,
 * drafts) stays with the caller.
 */
export interface DealFields {
  dealName: string;
  description: string;
  terms: string;
  priceNow: number;
  priceWas: number | undefined;
  isFlash: boolean;
  durationDays: number;
  durationMinutes: number;
  quantityAvailable: number | undefined;
  photoUrl: string;
  photoMediaId: string;
  category: string;
  categoryId: string;
  /** The business's own code, normalised; "" for a generated one. */
  customDealCode: string;
  codeOnWebsite: boolean;
  codeWebsiteUrl: string;
  bookingRequirement: Exclude<BookingRequirement, "unknown">;
}

export interface DealFieldRules {
  /** Why this type can't be submitted right now, or null. */
  typeBlocked: (isFlash: boolean) => string | null;
  /** Longest run allowed: minutes for Flash, days for Everyday. */
  maxDuration: (isFlash: boolean) => number;
  /** Why this photo URL isn't acceptable, or null. Only called with one. */
  photoError: (url: string) => string | null;
}

export type DealFieldsResult = { ok: true; fields: DealFields } | { ok: false; status: 400 | 403; error: string };

export function checkDealFields(body: any, rules: DealFieldRules): DealFieldsResult {
  const fail = (error: string, status: 400 | 403 = 400): DealFieldsResult => ({ ok: false, status, error });

  const dealName = String(body?.dealName || "").trim();
  const description = String(body?.description || "").trim();
  const terms = String(body?.terms || "").trim();
  const priceNow = Number(body?.priceNow);
  const priceWas = body?.priceWas !== undefined && body?.priceWas !== "" && body?.priceWas !== null ? Number(body.priceWas) : undefined;
  const isFlash = Boolean(body?.isFlash);
  const durationDays = Number(body?.durationDays);
  const durationMinutes = Number(body?.durationMinutes);
  const quantityAvailable =
    body?.quantityAvailable !== undefined && body?.quantityAvailable !== "" && body?.quantityAvailable !== null
      ? Number(body.quantityAvailable)
      : undefined;
  const photoUrl = body?.photoUrl ? String(body.photoUrl) : "";
  const photoMediaId = body?.photoMediaId ? String(body.photoMediaId) : "";
  const category = String(body?.category || "");
  // Optional: a code the business chose. Blank means we generate one.
  const customDealCode = normaliseDealCode(body?.dealCode);
  const categoryId = CATEGORY_ID_BY_NAME[category];

  // Wix Stores caps product names at 80 characters; past that the product
  // create failed and the business saw only "Couldn't create your deal".
  if (dealName.length > 80) return fail("Keep the deal name to 80 characters or fewer.");
  if (description.length > 5000 || terms.length > 2000) return fail("The description or conditions are too long.");
  if (customDealCode) {
    const codeError = dealCodeError(customDealCode);
    if (codeError) return fail(`Deal code: ${codeError}`);
  }
  // "Customers enter this code on my website": only the business's own
  // code, tested by them, with the link where it's used.
  const codeOnWebsite = body?.codeOnWebsite === true;
  const codeWebsiteUrl = typeof body?.codeWebsiteUrl === "string" ? body.codeWebsiteUrl.trim().slice(0, 500) : "";
  const websiteProblem = websiteCodeError({
    code: customDealCode,
    onWebsite: codeOnWebsite,
    url: codeWebsiteUrl,
    tested: body?.codeTested === true,
  });
  if (websiteProblem) return fail(websiteProblem);
  if (!dealName || !description || !terms) return fail("Deal name, description and terms are required.");
  // Explicit on every new submission (lib/booking.ts): the public page
  // never guesses "no booking needed" from a missing link or an unticked
  // box, so the merchant has to say.
  const bookingRequirement = body?.bookingRequirement;
  if (!isBookingChoice(bookingRequirement)) return fail("Choose whether customers need to book.");
  const conflict = bookingConflict(bookingRequirement, terms);
  if (conflict) return fail(conflict);
  if (!categoryId) return fail("Choose a category.");
  if (!Number.isFinite(priceNow) || priceNow <= 0) return fail("Enter a valid deal price.");
  if (priceWas !== undefined && (!Number.isFinite(priceWas) || priceWas < priceNow)) {
    return fail("Original price must be at least the deal price.");
  }
  const typeBlocked = rules.typeBlocked(isFlash);
  if (typeBlocked) return fail(`${typeBlocked} Save this deal as a draft for now.`, 403);
  // Flash up to 6 hours, Everyday up to 30 days (lib/dealDuration.ts), or
  // less if an admin has set a shorter maximum.
  const durationProblem = durationError(isFlash, isFlash ? durationMinutes : durationDays, rules.maxDuration(isFlash));
  if (durationProblem) return fail(durationProblem);
  if (quantityAvailable !== undefined && (!Number.isInteger(quantityAvailable) || quantityAvailable < 1)) {
    return fail("Quantity available must be a positive number.");
  }
  // A deal without a photo is close to unsellable on a grid of deals that
  // all have one, and it drags down the cards either side of it. Enforced
  // here rather than only in the form because this is the boundary: the
  // form's own check tells the merchant which field is missing, this one
  // is what makes it true.
  if (!photoUrl) return fail("Add a photo of your deal.");
  const photoProblem = rules.photoError(photoUrl);
  if (photoProblem) return fail(photoProblem);

  return {
    ok: true,
    fields: {
      dealName,
      description,
      terms,
      priceNow,
      priceWas,
      isFlash,
      durationDays,
      durationMinutes,
      quantityAvailable,
      photoUrl,
      photoMediaId,
      category,
      categoryId,
      customDealCode,
      codeOnWebsite,
      codeWebsiteUrl,
      bookingRequirement,
    },
  };
}
