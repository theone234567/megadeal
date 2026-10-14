import { dealOffer } from "./dealOffer";
import { htmlToText } from "./htmlText";
import { dealRedemption } from "./dealRedemption";
import { dealTagLabel } from "./dealTags";
import { dealVerification } from "./dealVerification";
import { nzCity } from "./nzPlaces";
import type { Deal } from "./types";

/**
 * The schema.org description of a live deal page, as one JSON-LD @graph:
 *
 *   WebPage        the page, with when it was published and last changed
 *   Product        what the deal is (Google shows deal-style results only
 *                  for Product, so services are described as one, with
 *                  their category)
 *   Offer          the price, the usual price, the dates it runs, where
 *                  it applies, how many are left
 *   LocalBusiness  the business offering it, with its address and pin
 *
 * Each node has an @id under the page's address, so the nodes refer to
 * each other and to the business's own page (/business/<slug>#business).
 * Built from the same deal data the page shows, on every request, so it
 * never says something the page doesn't.
 *
 * No AggregateRating: the business ratings MegaDeal holds are typed in by
 * an admin from elsewhere, and Google's rules only allow ratings collected
 * on the site itself. Add one once MegaDeal collects its own reviews.
 */

/** The place a deal applies in: its city (and region) in New Zealand. */
export function dealArea(city: string | null | undefined) {
  const known = nzCity(city);
  const country = { "@type": "Country", name: "New Zealand", identifier: "NZ" };
  if (!known && !city) return country;
  return {
    "@type": "City",
    name: known?.name ?? city,
    containedInPlace: known
      ? { "@type": "AdministrativeArea", name: known.region, containedInPlace: country }
      : country,
  };
}

/** The business, as its deal pages describe it. */
export function dealSeller(deal: Deal, siteUrl: string) {
  if (!deal.businessName) return undefined;
  return {
    "@type": "LocalBusiness",
    ...(deal.businessSlug
      ? { "@id": `${siteUrl}/business/${deal.businessSlug}#business`, url: `${siteUrl}/business/${deal.businessSlug}` }
      : {}),
    name: deal.businessName,
    telephone: deal.businessPhone || undefined,
    image: deal.businessLogoUrl || undefined,
    address:
      deal.businessAddress || deal.businessCity || deal.businessSuburb
        ? {
            "@type": "PostalAddress",
            streetAddress: deal.businessAddress || undefined,
            // The suburb as the locality, the city as the region, when
            // both are known ("Takapuna", "Auckland").
            addressLocality: deal.businessSuburb || deal.businessCity || undefined,
            addressRegion: deal.businessSuburb ? deal.businessCity || undefined : undefined,
            addressCountry: "NZ",
          }
        : undefined,
    // The pin the business set on its map, when it has one; never the
    // approximate one of a home-based or mobile business.
    geo:
      !deal.businessAddressHidden && typeof deal.businessLat === "number" && typeof deal.businessLng === "number"
        ? { "@type": "GeoCoordinates", latitude: deal.businessLat, longitude: deal.businessLng }
        : undefined,
    areaServed: deal.businessServiceArea || undefined,
  };
}

export function dealJsonLd(deal: Deal, siteUrl: string) {
  const url = `${siteUrl}/deal/${deal.slug}`;
  const seller = dealSeller(deal, siteUrl);
  const area = dealArea(deal.businessCity);
  const redemption = dealRedemption(deal, siteUrl);
  const verification = dealVerification(deal);
  const description = htmlToText(deal.description) || deal.name;
  const category = deal.categories[0] || undefined;
  const tags = (deal.tags ?? []).map(dealTagLabel);

  const offer = {
    ...dealOffer(deal, siteUrl, seller && "@id" in seller ? { "@id": seller["@id"] } : seller),
    "@id": `${url}#offer`,
    // When it runs: from the moment it went public to the moment it ends
    // (exact times; priceValidUntil keeps the date Google asks for).
    validFrom: deal.startsAt || undefined,
    validThrough: deal.expiresAt || undefined,
    areaServed: area,
    eligibleRegion: { "@type": "Country", name: "New Zealand", identifier: "NZ" },
    category,
    // How many are left, when the business set a limit.
    inventoryLevel:
      typeof deal.quantityAvailable === "number"
        ? { "@type": "QuantitativeValue", value: Math.max(0, deal.quantityAvailable) }
        : undefined,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: deal.name,
        inLanguage: "en-NZ",
        isPartOf: { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl },
        datePublished: deal.startsAt || undefined,
        dateModified: verification.updatedAt || undefined,
        // When someone last checked the deal is still right: MegaDeal's
        // approval, or the business confirming it in its portal.
        lastReviewed: verification.lastCheckedAt || undefined,
        mainEntity: { "@id": `${url}#deal` },
      },
      {
        "@type": "Product",
        "@id": `${url}#deal`,
        url,
        name: deal.name,
        description,
        // Every photo, main first: Google recommends several.
        image: deal.image ? [deal.image, ...(deal.gallery ?? [])] : undefined,
        sku: deal.id,
        category,
        keywords: tags.length ? tags.join(", ") : undefined,
        brand: deal.businessName ? { "@type": "Brand", name: deal.businessName } : undefined,
        additionalProperty: [
          { "@type": "PropertyValue", name: "Booking", value: redemption.booking },
          { "@type": "PropertyValue", name: "How to redeem", value: redemption.steps.join(" ") },
          { "@type": "PropertyValue", name: "Verification", value: verification.label },
          ...(deal.terms ? [{ "@type": "PropertyValue", name: "Conditions", value: deal.terms }] : []),
        ],
        offers: offer,
      },
      ...(seller ? [seller] : []),
    ],
  };
}
