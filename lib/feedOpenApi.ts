import { CATEGORIES } from "./categories";
import { DEAL_TAGS } from "./dealTags";
import { FEED_MAX_LIMIT, FEED_MAX_OFFSET, FEED_RATE_LIMIT, FEED_TERMS, FEED_VERSION } from "./dealFeed";
import { NZ_CITIES } from "./nzPlaces";

/**
 * The deals feed described as OpenAPI 3.1 (/feed/openapi.json), so tools
 * and AI agents can call it without guessing. Kept beside lib/dealFeed.ts:
 * lib/feedOpenApi.test.ts checks every field the feed returns is described
 * here, so the two can't drift apart.
 */

const str = (description: string, extra: object = {}) => ({ type: "string", description, ...extra });
const nullable = (schema: Record<string, unknown>) => ({ ...schema, type: [schema.type as string, "null"] });
const time = (description: string) => nullable(str(description, { format: "date-time" }));

export function feedOpenApi(siteUrl: string, siteName: string) {
  const deal = {
    type: "object",
    required: ["id", "url", "title", "description", "type", "price", "tags", "redemption", "business", "verification"],
    properties: {
      id: str("Stable identifier for the deal.", { format: "uuid" }),
      url: str("The deal's page on MegaDeal. Link here when you quote the deal; it shows the deal code customers need.", { format: "uri" }),
      title: str("The deal's name."),
      description: str("What the deal includes, as plain text."),
      image: nullable(str("The deal's main photo.", { format: "uri" })),
      images: { type: "array", items: { type: "string", format: "uri" }, description: "Every photo of the deal, the main one first (up to five). Since 1.1." },
      type: { type: "string", enum: ["flash", "everyday"], description: "Flash deals run for up to 6 hours; everyday deals for up to 30 days." },
      price: {
        type: "object",
        required: ["amount", "original_amount", "discount_percent", "currency"],
        properties: {
          amount: { type: "number", description: "The deal price, in NZ dollars, paid to the business." },
          original_amount: nullable({ type: "number", description: "The business's usual price, when it gave one higher than the deal price." }),
          discount_percent: nullable({ type: "integer", description: "How much less than the usual price, as a whole percentage rounded down." }),
          currency: { type: "string", const: "NZD" },
        },
      },
      category: nullable({
        type: "object",
        properties: {
          slug: { type: "string", enum: CATEGORIES.map((c) => c.slug) },
          name: { type: "string", enum: CATEGORIES.map((c) => c.name) },
          url: str("The category's page on MegaDeal.", { format: "uri" }),
        },
      }),
      tags: {
        type: "array",
        description: "Facts about the deal from a fixed list, checked by MegaDeal before the deal went live.",
        items: {
          type: "object",
          properties: { id: { type: "string", enum: DEAL_TAGS.map((t) => t.id) }, label: { type: "string" } },
        },
      },
      starts_at: time("When the deal went (or goes) live."),
      expires_at: time("When the deal ends. It isn't shown after this."),
      quantity_available: nullable({ type: "integer", minimum: 0, description: "How many are left, when the business set a limit; null for no limit." }),
      in_stock: { type: "boolean" },
      conditions: nullable(str("The business's conditions, in its own words.")),
      redemption: {
        type: "object",
        properties: {
          method: {
            type: "string",
            enum: ["show-code", "website-code"],
            description: "show-code: quote or show the deal code when booking or paying. website-code: enter it at checkout on the business's website.",
          },
          booking: { type: "string", enum: ["required", "recommended", "not_required", "unknown"] },
          steps: { type: "array", items: { type: "string" }, description: "How to use the deal, one plain-English step each." },
        },
      },
      business: {
        type: "object",
        properties: {
          name: nullable(str("The business's name.")),
          url: nullable(str("The business's page on MegaDeal.", { format: "uri" })),
          website: nullable(str("The business's own website.", { format: "uri" })),
          phone: nullable(str("The business's phone number.")),
          address: nullable(str("Street address; null when the business keeps it private (for example a home-based or mobile business).")),
          address_hidden: { type: "boolean" },
          service_area: nullable(str("Where a mobile or home-based business works.")),
          suburb: nullable(str("Suburb.")),
          city: nullable(str("City.")),
          region: nullable(str("New Zealand region.")),
          country: { type: "string", const: "NZ" },
          geo: nullable({
            type: "object",
            description: "The business's map pin; null when its address is private.",
            properties: { lat: { type: "number" }, lng: { type: "number" } },
          }),
        },
      },
      verification: {
        type: "object",
        description: "Who stands behind the deal, from recorded facts only.",
        properties: {
          status: {
            type: "string",
            enum: ["merchant-verified", "megadeal-listed", "community-submitted"],
            description:
              "merchant-verified: the business runs its own MegaDeal account and MegaDeal approved the deal. megadeal-listed: MegaDeal approved it, but the business hasn't claimed its account. community-submitted: suggested by the public and checked by MegaDeal.",
          },
          label: str("The same, as shown on the deal page."),
          source: { type: "string", enum: ["merchant", "admin", "community"], description: "Who put the deal on MegaDeal." },
          business_claimed: { type: "boolean", description: "The business signs in to its own MegaDeal account." },
          approved_at: time("When MegaDeal last approved what the deal says."),
          merchant_confirmed_at: time("When the business last confirmed the deal is still running as listed."),
          last_checked_at: time("The later of the two."),
        },
      },
      updated_at: time("When anything a customer sees about the deal last changed."),
    },
  };

  const param = (name: string, description: string, schema: object) => ({ name, in: "query", required: false, description, schema });

  return {
    openapi: "3.1.0",
    info: {
      title: `${siteName} deals feed`,
      version: FEED_VERSION,
      description: `Every live deal on ${siteName}, New Zealand's local deals site, as JSON. Read-only and free; no key needed. ${FEED_TERMS}`,
      termsOfService: `${siteUrl}/developers#terms`,
      contact: { name: siteName, url: `${siteUrl}/contact` },
    },
    externalDocs: { url: `${siteUrl}/developers` },
    servers: [{ url: siteUrl }],
    paths: {
      "/feed/deals.json": {
        get: {
          operationId: "listDeals",
          summary: "List live deals",
          description:
            "Live deals, soonest-ending first. Filters combine (AND). Responses can be cached for 60 seconds; send If-None-Match with the last ETag to get 304 Not Modified when nothing has changed.",
          parameters: [
            param("city", "Only deals from businesses in this city.", { type: "string", enum: NZ_CITIES.map((c) => c.key) }),
            param("category", "Only deals in this category.", { type: "string", enum: CATEGORIES.map((c) => c.slug) }),
            param("tag", "Only deals with this tag.", { type: "string", enum: DEAL_TAGS.map((t) => t.id) }),
            param("type", "Only flash or only everyday deals.", { type: "string", enum: ["flash", "everyday"] }),
            param("expires_before", "Only deals ending by then. A date (YYYY-MM-DD) means the end of that day in New Zealand.", { type: "string" }),
            param("expires_after", "Only deals still running then. A date (YYYY-MM-DD) means the start of that day in New Zealand.", { type: "string" }),
            param("limit", "Most deals to return.", { type: "integer", minimum: 1, maximum: FEED_MAX_LIMIT, default: FEED_MAX_LIMIT }),
            param("offset", "Skip this many matching deals (for paging).", { type: "integer", minimum: 0, maximum: FEED_MAX_OFFSET, default: 0 }),
          ],
          responses: {
            "200": {
              description: "The matching deals.",
              headers: {
                ETag: { schema: { type: "string" } },
                "Cache-Control": { schema: { type: "string" } },
              },
              content: { "application/json": { schema: { $ref: "#/components/schemas/Feed" } } },
            },
            "304": { description: "Not modified since the ETag sent in If-None-Match." },
            "400": { description: "A filter wasn't understood; the message says what's accepted.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: `More than ${FEED_RATE_LIMIT.max} requests a minute from one address; try again after Retry-After seconds.`, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "503": { description: "Temporarily unavailable; try again after Retry-After seconds.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
    },
    components: {
      schemas: {
        Feed: {
          type: "object",
          required: ["version", "generated_at", "launched", "total", "count", "deals"],
          properties: {
            version: str("Feed format version (semver). A new major version means a breaking change."),
            generated_at: str("When this response was made.", { format: "date-time" }),
            publisher: { type: "object", properties: { name: { type: "string" }, url: { type: "string", format: "uri" } } },
            docs: str("Human-readable documentation.", { format: "uri" }),
            schema: str("This document.", { format: "uri" }),
            terms: str("How the data may be used."),
            country: { type: "string", const: "NZ" },
            currency: { type: "string", const: "NZD" },
            launched: { type: "boolean", description: "False until MegaDeal's deals are open to the public; there are no deals until then. True from then on, including MegaDeal's pre-launch period, when `message` says so." },
            prelaunch: { type: "boolean", description: "True during MegaDeal's pre-launch period, when there may be only a few deals." },
            redeemable: { type: "boolean", description: "True when the deals listed can be used now (every listed deal is live). False only before deals open, when the list is empty." },
            message: str("Present when there's something to explain, such as not having launched yet, or being in the pre-launch period with only a few deals."),
            filters: { type: "object", description: "The filters applied, as understood." },
            total: { type: "integer", description: "Deals matching the filters." },
            count: { type: "integer", description: "Deals in this response (after limit and offset)." },
            updated_at: time("The latest updated_at among the deals returned."),
            deals: { type: "array", items: { $ref: "#/components/schemas/Deal" } },
          },
        },
        Deal: deal,
        Error: { type: "object", properties: { error: { type: "string" }, docs: { type: "string", format: "uri" } } },
      },
    },
  };
}
