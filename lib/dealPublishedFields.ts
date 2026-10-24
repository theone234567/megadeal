import "server-only";
import type { AiReviewInput } from "./aiReview";
import { dealTagLabel } from "./dealTags";
import { contactInText, linkProblems, ownDomains, plausibleNzPhone, type PublishedLink } from "./linkSafety";
import { safeBrowsingProblems } from "./linkSafetyLookup";

/**
 * Everything a deal page publishes beyond its wording and main photo
 * (SEO pack T207): this deal's own contact details, the page its code is
 * used on, what customers are told to do, its tags and its extra photos.
 * They go to the automatic check with the rest, and the plain rules here
 * hold a deal for a person whatever the check says: a link that isn't the
 * business's own or a known booking platform, a phone that isn't a New
 * Zealand number, contact details in the instructions.
 */
export async function publishedFieldsFor(
  deal: Record<string, any>,
  merchant: Record<string, any> | null,
): Promise<{ extras: Partial<AiReviewInput>; heldFor: string[] }> {
  const override = deal.contactOverride && typeof deal.contactOverride === "object" ? deal.contactOverride : {};
  const contact = {
    phone: typeof override.phone === "string" ? override.phone : null,
    bookingUrl: typeof override.bookingUrl === "string" ? override.bookingUrl : null,
    website: typeof override.website === "string" ? override.website : null,
    email: typeof override.email === "string" ? override.email : null,
  };
  const codeWebsiteUrl = typeof deal.codeWebsiteUrl === "string" && deal.codeWebsiteUrl.trim() ? deal.codeWebsiteUrl.trim() : null;
  const links: PublishedLink[] = [
    ...(contact.bookingUrl ? [{ field: "booking link", value: contact.bookingUrl, kind: "url" as const }] : []),
    ...(contact.website ? [{ field: "website link", value: contact.website, kind: "url" as const }] : []),
    ...(contact.email ? [{ field: "email", value: contact.email, kind: "email" as const }] : []),
    ...(codeWebsiteUrl ? [{ field: "redeem link", value: codeWebsiteUrl, kind: "url" as const }] : []),
  ];
  const heldFor = linkProblems(links, ownDomains(merchant));
  if (contact.phone && !plausibleNzPhone(contact.phone)) heldFor.push("the deal's phone number doesn't look like a New Zealand number");
  const inText = contactInText(deal.customerInstructions);
  if (inText) heldFor.push(`"What customers do" contains ${inText}`);
  heldFor.push(...(await safeBrowsingProblems(links.filter((l) => l.kind === "url").map((l) => ({ field: l.field, url: l.value })))));
  const tags = Array.isArray(deal.tags) ? deal.tags.filter((t: unknown): t is string => typeof t === "string").map((t: string) => dealTagLabel(t) ?? t) : [];
  const gallery = Array.isArray(deal.gallery) ? deal.gallery.filter((u: unknown): u is string => typeof u === "string" && u.length > 0) : [];
  return {
    extras: {
      contact: Object.values(contact).some(Boolean) ? contact : null,
      codeWebsiteUrl,
      customerInstructions: typeof deal.customerInstructions === "string" ? deal.customerInstructions : null,
      tags,
      gallery,
    },
    heldFor,
  };
}
