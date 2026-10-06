import type { Deal } from "./types";

/** "YYYY-MM-DD" for a moment, as the date it is in New Zealand. */
export function nzDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  // en-CA writes dates as YYYY-MM-DD.
  return new Date(t).toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
}

/**
 * The schema.org Offer for a deal page (app/deal/[slug]/page.tsx), as
 * Google reads it for product results:
 *  - priceValidUntil is a date, which is what Google asks for (a full
 *    timestamp was sent before), the deal's last day in New Zealand.
 *  - A real discount also carries the usual price as a StrikethroughPrice,
 *    so the saving is in the data, not only on the page.
 */
export function dealOffer(deal: Pick<Deal, "slug" | "now" | "was" | "currency" | "inStock" | "expiresAt">, siteUrl: string, seller?: unknown) {
  const currency = deal.currency || "NZD";
  const discounted = Number(deal.was) > Number(deal.now);
  return {
    "@type": "Offer",
    url: `${siteUrl}/deal/${deal.slug}`,
    priceCurrency: currency,
    price: deal.now,
    ...(discounted
      ? {
          priceSpecification: [
            { "@type": "UnitPriceSpecification", price: deal.now, priceCurrency: currency },
            { "@type": "UnitPriceSpecification", priceType: "https://schema.org/StrikethroughPrice", price: deal.was, priceCurrency: currency },
          ],
        }
      : {}),
    availability: deal.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    priceValidUntil: nzDate(deal.expiresAt),
    seller,
  };
}
