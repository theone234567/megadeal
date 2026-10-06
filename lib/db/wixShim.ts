import { createHash, randomUUID } from "crypto";
import { CATEGORIES } from "../categories";
import { slugifyName } from "../slug";
import type { Sql } from "./connection";

/**
 * MegaDeal's own database, behind the same calls the site makes to Wix
 * today (`items.query/get/insert/update/remove`, the few Stores product
 * calls, and the conditional "patch" requests in lib/creditsAtomic.ts).
 *
 * Why this rather than rewriting every route: about forty routes hold
 * years of fixes for real problems (double submissions, lost updates,
 * refunds, claiming a business by email). Swapping what's underneath and
 * keeping that logic is far less likely to break something than writing
 * it all again. Routes can move to plain SQL one at a time afterwards.
 *
 * Records look the way Wix returns them: camelCase fields, `_id`, empty
 * fields left out, dates as ISO strings (`_createdDate` as a Date), JSON
 * kept as text where the site stores text. Writes are checked: a field
 * this file doesn't know is an error, never silently dropped.
 *
 * Differences that matter:
 * - A deal is one row. Its "product" is that row: `productId` is the
 *   deal's own id once it has a page address (slug).
 * - Deals and activity point at a business by id; `merchantEmail` is read
 *   from (and written to) that link.
 * - Email tokens are stored hashed, so they can be looked up but not read
 *   back.
 * - A business brought over from Wix keeps its Wix id as `_id`, so its
 *   page address doesn't change.
 */

type Row = Record<string, any>;
export type Run = <T>(fn: (db: Sql) => Promise<T>) => Promise<T>;

// ---------------------------------------------------------------------------
// Field codecs
// ---------------------------------------------------------------------------

interface Field {
  /** The Wix field name. */
  wix: string;
  /** Column in the table (alias t), or null for a computed field. */
  col: string | null;
  /** SQL to read it, if not t.<col>. */
  expr?: string;
  read?: (v: any) => any;
  write?: (v: any) => any;
  /** Keep "" as "" (the column is NOT NULL); otherwise "" is stored as null. */
  keepBlank?: boolean;
  readOnly?: boolean;
}

const SLUG_BY_NAME = new Map(CATEGORIES.map((c) => [c.name.toLowerCase(), c.slug]));
const NAME_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c.name]));
const ID_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c.id]));
const SLUG_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c.slug]));

const num = (v: any) => (v === null || v === undefined || v === "" ? null : Number(v));
const iso = (v: any) => {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const asDate = (v: any) => (v ? (v instanceof Date ? v : new Date(v)) : null);

/** JSON kept as text by the site (draftData, pendingRevision, photos). */
const jsonText = {
  read: (v: any) => (v === null || v === undefined ? null : JSON.stringify(v)),
  write: (v: any) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v !== "string") return JSON.stringify(v);
    JSON.parse(v); // throws on bad JSON rather than storing it
    return v;
  },
};
/** JSON the site stores as an object. */
const jsonObject = {
  read: (v: any) => v,
  write: (v: any) => (v === null || v === undefined || v === "" ? null : JSON.stringify(v)),
};
const category = {
  read: (slug: any) => (slug ? NAME_BY_SLUG.get(slug) ?? null : null),
  write: (name: any) => {
    if (name === null || name === undefined || name === "") return null;
    const slug = SLUG_BY_NAME.get(String(name).toLowerCase()) ?? (NAME_BY_SLUG.has(String(name)) ? String(name) : null);
    if (!slug) throw new Error(`Unknown category "${name}"`);
    return slug;
  },
};
const hashed = (v: any) => (v === null || v === undefined || v === "" ? null : createHash("sha256").update(String(v)).digest("hex"));

function f(wix: string, col: string | null, extra: Partial<Field> = {}): Field {
  return { wix, col, ...extra };
}
const numeric = (wix: string, col: string) => f(wix, col, { read: num, write: num });
const timestamp = (wix: string, col: string) => f(wix, col, { read: iso, write: iso });
const bool = (wix: string, col: string) => f(wix, col, { write: (v: any) => Boolean(v) });

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

interface Collection {
  table: string;
  /** Primary key column. */
  pk?: string;
  from: string;
  /** SQL for `_id`, and the WHERE that finds one row by it ($1). */
  idExpr: string;
  idWhere: string;
  fields: Field[];
  /** Fields a record carries but writes ignore (Wix's own). */
  ignoreOnWrite: string[];
  /** Turns a write's resolved columns into final ones (links, rules). */
  beforeWrite?: (cols: Row, item: Row, db: Sql, ctx: ShimContext, existing: Row | null) => Promise<void>;
}

const MERCHANTS: Collection = {
  table: "merchants",
  from: "public.merchants t",
  idExpr: "coalesce(t.wix_id, t.id::text)",
  idWhere: "(t.wix_id = $1 or t.id::text = $1)",
  ignoreOnWrite: ["_id", "_createdDate", "_updatedDate"],
  fields: [
    f("_owner", "wix_owner_id"),
    f("_createdDate", null, { expr: "t.created_at", read: asDate, readOnly: true }),
    f("_updatedDate", null, { expr: "t.updated_at", read: asDate, readOnly: true }),
    f("businessName", "business_name", { keepBlank: true }),
    f("legalBusinessName", "legal_business_name"),
    f("nzbn", "nzbn"),
    f("contactName", "contact_name"),
    f("contactPhone", "contact_phone"),
    f("email", "email", { keepBlank: true }),
    bool("emailVerified", "email_verified"),
    f("phone", "phone"),
    f("website", "website"),
    f("bookingUrl", "booking_url"),
    f("bookingEmail", "booking_email"),
    f("facebookUrl", "facebook_url"),
    f("instagramUrl", "instagram_url"),
    f("address", "address"),
    f("suburb", "suburb"),
    f("city", "city"),
    f("postcode", "postcode"),
    numeric("lat", "lat"),
    numeric("lng", "lng"),
    f("category", "category_slug", category),
    f("bio", "bio"),
    f("businessHours", "business_hours"),
    f("priceRange", "price_range"),
    f("amenities", "amenities", {
      read: (v: any) => (Array.isArray(v) && v.length ? v.join(", ") : null),
      write: (v: any) =>
        String(v ?? "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
    }),
    f("photos", "photos", {
      read: (v: any) => (Array.isArray(v) && v.length ? JSON.stringify(v) : null),
      write: (v: any) => {
        if (!v) return "[]";
        const parsed = typeof v === "string" ? JSON.parse(v) : v;
        if (!Array.isArray(parsed)) throw new Error("photos must be a list");
        return JSON.stringify(parsed);
      },
    }),
    f("logoUrl", "logo_url"),
    numeric("rating", "rating"),
    numeric("reviewCount", "review_count"),
    f("creditsBalance", "credits_balance", { read: num, write: (v: any) => num(v) ?? 0 }),
    f("couponCode", "coupon_code"),
    f("referralCode", "referral_code"),
    f("referredByCode", "referred_by_code"),
    bool("referralRewarded", "referral_rewarded"),
    bool("promoRewarded", "promo_rewarded"),
    bool("notifyReferralBonus", "notify_referral_bonus"),
    f("rudenessCheck", "rudeness_check"),
    f("status", "status"),
    timestamp("firstApprovedAt", "first_approved_at"),
    f("defaultBookingRequirement", "default_booking_requirement"),
  ],
};

const DEALS: Collection = {
  table: "deals",
  from: "public.deals t join public.merchants m on m.id = t.merchant_id",
  idExpr: "t.id::text",
  idWhere: "(t.id::text = $1 or t.wix_id = $1)",
  ignoreOnWrite: ["_id", "_owner", "_createdDate", "_updatedDate", "merchantId"],
  fields: [
    f("_createdDate", null, { expr: "t.created_at", read: asDate, readOnly: true }),
    f("_updatedDate", null, { expr: "t.updated_at", read: asDate, readOnly: true }),
    // The deal is its own product once it has a page address.
    f("productId", null, { expr: "case when t.slug is not null then t.id::text end" }),
    f("merchantEmail", null, { expr: "m.email" }),
    f("dealName", "name", { keepBlank: true, write: (v: any) => v ?? "" }),
    f("description", "description", { keepBlank: true, write: (v: any) => v ?? "" }),
    f("category", "category_slug", category),
    f("terms", "terms"),
    numeric("priceNow", "price_now"),
    numeric("priceWas", "price_was"),
    numeric("quantityAvailable", "quantity_available"),
    f("photoUrl", "photo_url"),
    bool("isFlash", "is_flash"),
    f("status", "status"),
    f("pausedBy", "paused_by"),
    f("statusNote", "status_note"),
    f("bookingRequirement", "booking_requirement"),
    f("dealCode", "deal_code"),
    f("codeOnWebsite", "code_on_website"),
    f("codeWebsiteUrl", "code_website_url"),
    f("creditsCharged", "credits_charged", { read: num, write: (v: any) => num(v) ?? 0 }),
    bool("creditRefunded", "credit_refunded"),
    numeric("requestedDurationMinutes", "requested_duration_minutes"),
    timestamp("scheduledStartAt", "scheduled_start_at"),
    timestamp("firstApprovedAt", "first_approved_at"),
    timestamp("firstPublishedAt", "first_published_at"),
    timestamp("expiresAt", "expires_at"),
    bool("everLive", "ever_live"),
    f("pendingRevision", "pending_revision", jsonText),
    f("pendingPhotoUrl", "pending_photo_url"),
    f("pendingPhotoReview", "pending_photo_review", jsonObject),
    f("aiReview", "ai_review", jsonObject),
    f("contentHistory", "content_history", {
      read: (v: any) => (Array.isArray(v) && v.length ? v : null),
      write: (v: any) => JSON.stringify(Array.isArray(v) ? v : []),
    }),
    f("draftData", "draft_data", jsonText),
    f("draftRevision", "draft_revision", { read: num, write: (v: any) => num(v) ?? 0 }),
    bool("isTest", "is_test"),
    ...["view", "click", "codeCopy", "websiteClick", "callClick", "emailClick", "directionsClick"].map((n) =>
      f(`${n}Count`, `${n.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}_count`, { read: num, write: (v: any) => num(v) ?? 0 })
    ),
  ],
  async beforeWrite(cols, item, db, ctx, existing) {
    // The business, by its email (how the site links them today).
    if ("merchantEmail" in item && (!existing || String(item.merchantEmail ?? "").toLowerCase() !== String(existing.merchantEmail ?? "").toLowerCase())) {
      const [m] = await db.query<{ id: string }>("select id from public.merchants where lower(email) = lower($1)", [String(item.merchantEmail ?? "")]);
      if (!m) throw new Error(`No business with email ${item.merchantEmail}`);
      cols.merchant_id = m.id;
    }
    // A product made earlier in this request (deal submission) becomes
    // this row's address, name, price and category.
    const pending = item.productId ? ctx.pendingProducts.get(item.productId) : undefined;
    if (pending) {
      cols.slug = pending.slug;
      cols.name ??= pending.name;
      if (pending.categorySlug) cols.category_slug = pending.categorySlug;
      if (!existing) cols.id = item.productId;
      ctx.pendingProducts.delete(item.productId);
    }
    // Who paused it: a business can lift only its own pause. Admin routes
    // say "admin"; any other pause is the business's.
    if ("status" in cols) {
      if (cols.status === "Paused") cols.paused_by = cols.paused_by ?? (existing?.status === "Paused" && existing.pausedBy ? existing.pausedBy : "business");
      else cols.paused_by = null;
    }
  },
};

const ACTIVITY: Collection = {
  table: "merchant_activity",
  from: "public.merchant_activity t join public.merchants m on m.id = t.merchant_id",
  idExpr: "t.id::text",
  idWhere: "t.id::text = $1",
  ignoreOnWrite: ["_id", "_owner", "_createdDate", "_updatedDate"],
  fields: [
    f("_createdDate", null, { expr: "t.created_at", read: asDate, readOnly: true }),
    f("merchantEmail", null, { expr: "m.email" }),
    f("type", "type"),
    numeric("amount", "amount"),
    f("description", "description", { keepBlank: true }),
  ],
  async beforeWrite(cols, item, db) {
    const [m] = await db.query<{ id: string }>("select id from public.merchants where lower(email) = lower($1)", [String(item.merchantEmail ?? "")]);
    if (!m) throw new Error(`No business with email ${item.merchantEmail}`);
    cols.merchant_id = m.id;
  },
};

const EMAIL_SIGNUPS: Collection = {
  table: "email_signups",
  from: "public.email_signups t",
  idExpr: "t.id::text",
  idWhere: "(t.id::text = $1 or t.wix_id = $1)",
  ignoreOnWrite: ["_id", "_owner", "_createdDate", "_updatedDate"],
  fields: [
    f("_createdDate", null, { expr: "t.created_at", read: asDate, readOnly: true }),
    f("email", "email", { keepBlank: true }),
    f("audience", "audience"),
    f("source", "source"),
    bool("verified", "verified"),
    bool("unsubscribed", "unsubscribed"),
    // Stored hashed: found by the token, never read back.
    f("verifyToken", "verify_token_hash", { expr: "null::text", write: hashed }),
    f("unsubscribeToken", "unsubscribe_token_hash", { expr: "null::text", write: hashed }),
  ],
};

const CONTACT_MESSAGES: Collection = {
  table: "contact_messages",
  from: "public.contact_messages t",
  idExpr: "t.id::text",
  idWhere: "t.id::text = $1",
  ignoreOnWrite: ["_id", "_owner", "_createdDate", "_updatedDate"],
  fields: [
    f("_createdDate", null, { expr: "t.created_at", read: asDate, readOnly: true }),
    f("name", "name", { keepBlank: true }),
    f("email", "email", { keepBlank: true }),
    f("message", "message", { keepBlank: true }),
  ],
};

const SITE_SETTINGS: Collection = {
  table: "site_settings",
  pk: "key",
  from: "public.site_settings t",
  idExpr: "t.key",
  idWhere: "t.key = $1",
  ignoreOnWrite: ["_id", "_owner", "_createdDate", "_updatedDate"],
  fields: [f("key", "key"), f("value", "value")],
};

const COLLECTIONS: Record<string, Collection> = {
  Merchants: MERCHANTS,
  Deals: DEALS,
  MerchantActivity: ACTIVITY,
  EmailSignups: EMAIL_SIGNUPS,
  ContactMessages: CONTACT_MESSAGES,
  SiteSettings: SITE_SETTINGS,
};

function collection(name: string): Collection {
  const c = COLLECTIONS[name];
  if (!c) throw new Error(`Collection ${name} isn't in the new database`);
  return c;
}

/** SQL that reads a field, for selects and filters. */
function fieldExpr(c: Collection, wix: string): { expr: string; field: Field | null } {
  if (wix === "_id") return { expr: c.idExpr, field: null };
  const field = c.fields.find((x) => x.wix === wix);
  if (!field) throw new Error(`Unknown field ${wix} on ${c.table}`);
  return { expr: field.expr ?? `t.${field.col}`, field };
}

function selectList(c: Collection): string {
  return [`${c.idExpr} as "_id"`, ...c.fields.map((x) => `${x.expr ?? `t.${x.col}`} as "${x.wix}"`)].join(", ");
}

/** A database row as Wix would return the record: empty fields left out. */
function toItem(c: Collection, row: Row): Row {
  const item: Row = { _id: row._id };
  for (const x of c.fields) {
    const v = x.read ? x.read(row[x.wix]) : row[x.wix];
    if (v !== null && v !== undefined) item[x.wix] = v;
  }
  return item;
}

/** A filter value in the column's own terms. */
function filterValue(field: Field | null, value: any): any {
  if (!field) return String(value);
  if (field.write && field.col) return field.write(value);
  return value;
}

// ---------------------------------------------------------------------------
// The client
// ---------------------------------------------------------------------------

interface PendingProduct {
  slug: string;
  name: string;
  categorySlug?: string;
}

interface ShimContext {
  pendingProducts: Map<string, PendingProduct>;
}

class Query {
  private conds: string[] = [];
  private params: unknown[] = [];
  private lim = 50; // Wix's default page
  private off = 0;

  constructor(private c: Collection, private run: Run) {}

  private add(sql: (expr: string, p: string) => string, wix: string, value?: unknown, raw = false) {
    const { expr, field } = fieldExpr(this.c, wix);
    if (value === undefined) {
      this.conds.push(sql(expr, ""));
      return this;
    }
    // Emails match whatever their capitals, as the site always intended
    // (lib/queryAll.ts queryAllByEmail tried both spellings).
    const isEmail = wix === "email" || wix === "merchantEmail";
    this.params.push(raw ? value : filterValue(field, value));
    const p = `$${this.params.length}`;
    this.conds.push(isEmail ? sql(`lower(${expr})`, `lower(${p})`) : sql(expr, p));
    return this;
  }

  eq(field: string, value: unknown) {
    if (value === null || value === undefined) return this.add((e) => `${e} is null`, field);
    // A token is found by its hash; the hash column has no readable value.
    const tokenCol = this.c === EMAIL_SIGNUPS && (field === "verifyToken" || field === "unsubscribeToken");
    if (tokenCol) {
      if (!value) {
        this.conds.push("false");
        return this;
      }
      const col = field === "verifyToken" ? "t.verify_token_hash" : "t.unsubscribe_token_hash";
      this.params.push(hashed(value));
      this.conds.push(`${col} = $${this.params.length}`);
      return this;
    }
    return this.add((e, p) => `${e} = ${p}`, field, value);
  }
  ne(field: string, value: unknown) {
    return this.add((e, p) => `${e} is distinct from ${p}`, field, value);
  }
  isNotEmpty(field: string) {
    return this.add((e) => `(${e} is not null and ${e}::text <> '')`, field);
  }
  limit(n: number) {
    this.lim = Math.max(0, Math.min(1000, n));
    return this;
  }
  skip(n: number) {
    this.off = Math.max(0, n);
    return this;
  }
  async find(): Promise<{ items: Row[] }> {
    const sql = `select ${selectList(this.c)} from ${this.c.from}
      ${this.conds.length ? `where ${this.conds.join(" and ")}` : ""}
      order by ${this.c === SITE_SETTINGS ? "t.key" : "t.created_at desc, t.id"}
      limit ${this.lim} offset ${this.off}`;
    const rows = await this.run((db) => db.query(sql, this.params));
    return { items: rows.map((r) => toItem(this.c, r)) };
  }
}

async function getItem(db: Sql, c: Collection, id: string): Promise<Row | null> {
  const [row] = await db.query(`select ${selectList(c)} from ${c.from} where ${c.idWhere}`, [String(id)]);
  return row ? toItem(c, row) : null;
}

/** The columns a write sets, from a Wix-shaped record. Unknown fields are
 *  an error: nothing the site saves may vanish on the way in. */
function columnsFor(c: Collection, item: Row): Row {
  const cols: Row = {};
  for (const [key, value] of Object.entries(item)) {
    if (c.ignoreOnWrite.includes(key) || value === undefined) continue;
    const field = c.fields.find((x) => x.wix === key);
    if (!field) throw new Error(`Unknown field ${key} on ${c.table}`);
    if (!field.col || field.readOnly) continue;
    const v = value === "" && !field.keepBlank ? null : value;
    cols[field.col] = field.write ? field.write(v) : v;
  }
  return cols;
}

/** Converts a Wix-style error-free write into SQL and runs it. */
async function writeRow(db: Sql, c: Collection, ctx: ShimContext, item: Row, existing: Row | null, existingId: string | null): Promise<string> {
  const cols = columnsFor(c, item);
  await c.beforeWrite?.(cols, item, db, ctx, existing);
  const keys = Object.keys(cols);
  if (existingId === null) {
    const [row] = await db.query<{ id: string }>(
      `insert into public.${c.table} (${keys.join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")}) returning ${c.idExpr.replace(/t\./g, "")} as id`,
      keys.map((k) => cols[k])
    );
    return row.id;
  }
  if (keys.length) {
    await db.query(
      `update public.${c.table} t set ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")} where ${c.idWhere}`,
      [existingId, ...keys.map((k) => cols[k])]
    );
  }
  return existingId;
}

/**
 * A stand-in for the Wix admin client, on MegaDeal's database. `run`
 * gives each operation a connection (lib/db/connection.ts withDb, or the
 * tests' in-process database). `wix` is the real Wix client, still used
 * for what hasn't moved yet (photo uploads, email, logins).
 */
export function createPgAdminClient(run: Run, wix?: () => { fetchWithAuth: (url: string, init?: any) => Promise<Response> }) {
  const ctx: ShimContext = { pendingProducts: new Map() };

  const items = {
    query: (name: string) => new Query(collection(name), run),
    get: (name: string, id: string) => run((db) => getItem(db, collection(name), id)),
    insert: async (name: string, item: Row) => {
      const c = collection(name);
      return run(async (db) => {
        const id = await writeRow(db, c, ctx, item, null, null);
        return (await getItem(db, c, id))!;
      });
    },
    update: async (name: string, item: Row) => {
      const c = collection(name);
      if (!item?._id) throw new Error("update needs _id");
      return run(async (db) => {
        const existing = await getItem(db, c, item._id);
        if (!existing) throw Object.assign(new Error(`${name} ${item._id} not found`), { status: 404 });
        await writeRow(db, c, ctx, item, existing, item._id);
        return (await getItem(db, c, item._id))!;
      });
    },
    remove: async (name: string, id: string) => {
      const c = collection(name);
      return run(async (db) => {
        const existing = await getItem(db, c, id);
        await db.query(`delete from public.${c.table} t where ${c.idWhere}`, [String(id)]);
        return existing;
      });
    },
  };

  const productsV3 = {
    getProduct: (id: string) => run((db) => readProduct(db, "(t.id::text = $1 or t.wix_product_id = $1)", id)),
    getProductBySlug: async (slug: string) => ({ product: await run((db) => readProduct(db, "t.slug = $1", slug)) }),
    searchProducts: async () => ({
      products: await run(async (db) => (await db.query(`select ${PRODUCT_COLUMNS} from public.deals t where t.slug is not null order by t.created_at desc`)).map(toProduct)),
      pagingMetadata: { hasNext: false },
    }),
  };

  async function fetchWithAuth(url: string, init: { method?: string; body?: string } = {}): Promise<Response> {
    const method = (init.method ?? "GET").toUpperCase();
    const body = init.body ? JSON.parse(init.body) : null;
    let m: RegExpMatchArray | null;

    if ((m = url.match(/\/wix-data\/v2\/items\/([^/?]+)$/)) && method === "PATCH") {
      return run((db) => conditionalPatch(db, collection(body.dataCollectionId), decodeURIComponent(m![1]), body));
    }
    if (/\/stores\/v3\/products-with-inventory$/.test(url) && method === "POST") {
      const name = String(body?.product?.name ?? "").trim();
      const slug = await run((db) => freeSlug(db, name, ctx));
      const id = randomUUID();
      ctx.pendingProducts.set(id, { slug, name });
      return json({ product: { id, slug, name } });
    }
    if (/\/categories\/v1\/bulk\/categories\/add-item$/.test(url) && method === "POST") {
      const pending = ctx.pendingProducts.get(body?.item?.catalogItemId);
      const slug = SLUG_BY_ID.get(body?.categoryIds?.[0]);
      if (pending && slug) pending.categorySlug = slug;
      return json({});
    }
    if ((m = url.match(/\/stores\/v3\/products\/([^/?]+)$/))) {
      const id = decodeURIComponent(m[1]);
      if (method === "DELETE") {
        // Only a product made in this request can go (a failed
        // submission's); a deal's own row is removed through items.
        ctx.pendingProducts.delete(id);
        return json({});
      }
      if (method === "GET") {
        const product = await run((db) => readProduct(db, "(t.id::text = $1 or t.wix_product_id = $1)", id));
        return product ? json({ product }) : json({ message: "not found" }, 404);
      }
      if (method === "PATCH") {
        return run((db) => patchProduct(db, id, body?.product ?? {}));
      }
    }
    if (!wix) throw new Error(`No Wix client for ${method} ${url}`);
    return wix().fetchWithAuth(url, init);
  }

  return { items, productsV3, fetchWithAuth, __postgres: true as const };
}

export type PgAdminClient = ReturnType<typeof createPgAdminClient>;

/** True for the database stand-in (vs the real Wix client). */
export function isPgClient(client: unknown): client is PgAdminClient {
  return Boolean((client as { __postgres?: boolean } | null)?.__postgres);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// ---------------------------------------------------------------------------
// Products: a deal's page-facing half
// ---------------------------------------------------------------------------

const PRODUCT_COLUMNS = "t.id, t.wix_product_id, t.slug, t.name, t.description, t.price_now, t.price_was, t.photo_url, t.category_slug, t.ribbon, t.quantity_available, t.updated_at";

/** A deal row in the shape of a Wix Stores product (lib/mapDeal.ts). */
function toProduct(r: Row): Row {
  const now = r.price_now === null ? null : String(Number(r.price_now));
  const was = r.price_was === null ? now : String(Number(r.price_was));
  const categoryId = r.category_slug ? ID_BY_SLUG.get(r.category_slug) : undefined;
  return {
    id: r.id,
    _id: r.id,
    slug: r.slug,
    name: r.name,
    plainDescription: r.description ?? "",
    revision: "1",
    options: [],
    variantsInfo: {
      variants: [
        {
          id: "00000000-0000-0000-0000-000000000000",
          choices: [],
          price: { actualPrice: { amount: now }, compareAtPrice: { amount: was } },
          inventoryStatus: { inStock: r.quantity_available !== 0 },
        },
      ],
    },
    media: r.photo_url ? { main: { image: { url: r.photo_url } } } : {},
    allCategoriesInfo: { categories: categoryId ? [{ id: categoryId }] : [] },
    ribbon: r.ribbon ? { name: r.ribbon } : null,
    updatedDate: r.updated_at instanceof Date ? r.updated_at : r.updated_at ? new Date(r.updated_at) : null,
  };
}

async function readProduct(db: Sql, where: string, value: string): Promise<Row | null> {
  const [row] = await db.query(`select ${PRODUCT_COLUMNS} from public.deals t where t.slug is not null and ${where}`, [value]);
  return row ? toProduct(row) : null;
}

/** An admin's change to a deal's name or price (lib/dealAdminEdit.ts
 *  buildProductUpdate). The description lives on the deal itself. */
async function patchProduct(db: Sql, id: string, product: Row): Promise<Response> {
  const sets: string[] = [];
  const params: unknown[] = [id];
  if (typeof product.name === "string") {
    params.push(product.name);
    sets.push(`name = $${params.length}`);
  }
  const price = product.variantsInfo?.variants?.[0]?.price;
  if (price?.actualPrice?.amount !== undefined) {
    params.push(Number(price.actualPrice.amount));
    sets.push(`price_now = $${params.length}`);
  }
  if (price?.compareAtPrice?.amount !== undefined) {
    params.push(Number(price.compareAtPrice.amount));
    sets.push(`price_was = $${params.length}`);
  }
  if (!sets.length) return json({ product: await readProduct(db, "t.id::text = $1", id) });
  const rows = await db.query(`update public.deals t set ${sets.join(", ")} where (t.id::text = $1 or t.wix_product_id = $1) and t.slug is not null returning t.id`, params);
  if (!rows.length) return json({ message: "not found" }, 404);
  return json({ product: await readProduct(db, "t.id::text = $1", rows[0].id) });
}

/** A page address for a new deal, made from its name as Wix does
 *  ("two-course-dinner", then "two-course-dinner-1", …). */
async function freeSlug(db: Sql, name: string, ctx: ShimContext): Promise<string> {
  const base = slugifyName(name) || "deal";
  const taken = new Set(
    (await db.query<{ slug: string }>("select slug from public.deals where slug = $1 or slug like $1 || '-%'", [base])).map((r) => r.slug)
  );
  for (const p of ctx.pendingProducts.values()) taken.add(p.slug);
  if (!taken.has(base)) return base;
  for (let n = 1; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

// ---------------------------------------------------------------------------
// Conditional patches (lib/creditsAtomic.ts): one statement, so the check
// and the change can't be split by another request.
// ---------------------------------------------------------------------------

const OPS: Record<string, string> = { $eq: "=", $ne: "is distinct from", $gte: ">=", $gt: ">", $lte: "<=", $lt: "<" };

async function conditionalPatch(db: Sql, c: Collection, id: string, body: Row): Promise<Response> {
  const params: unknown[] = [id];
  const sets: string[] = [];
  for (const mod of body?.patch?.fieldModifications ?? []) {
    const field = c.fields.find((x) => x.wix === mod.fieldPath);
    if (!field?.col || field.readOnly) return json({ message: `Unknown field ${mod.fieldPath}` }, 400);
    if (mod.action === "INCREMENT_FIELD") {
      params.push(Number(mod.incrementFieldOptions?.value));
      sets.push(`${field.col} = coalesce(${field.col}, 0) + $${params.length}`);
    } else if (mod.action === "SET_FIELD") {
      const v = mod.setFieldOptions?.value;
      params.push(field.write ? field.write(v) : v);
      sets.push(`${field.col} = $${params.length}`);
    } else {
      return json({ message: `Unsupported ${mod.action}` }, 400);
    }
  }
  const status = sets.some((s) => s.startsWith("status ="));
  if (c === DEALS && status) {
    // Keep "who paused it" in step with a status set this way.
    const statusParam = params[sets.findIndex((s) => s.startsWith("status =")) + 1];
    sets.push(statusParam === "Paused" ? "paused_by = coalesce(paused_by, 'business')" : "paused_by = null");
  }
  const conds: string[] = [];
  for (const [wix, cond] of Object.entries(body?.condition?.filter ?? {})) {
    const { expr, field } = fieldExpr(c, wix);
    const entries = cond !== null && typeof cond === "object" ? Object.entries(cond as Row) : [["$eq", cond]];
    for (const [op, value] of entries) {
      if (!OPS[op]) return json({ message: `Unsupported condition ${op}` }, 400);
      params.push(filterValue(field, value));
      conds.push(op === "$ne" ? `(${expr} is distinct from $${params.length})` : `${expr} ${OPS[op]} $${params.length}`);
    }
  }
  // The update can't join, so conditions on a joined field use a subquery.
  const where = `${c.idWhere}${conds.length ? ` and ${conds.join(" and ")}` : ""}`;
  try {
    const rows = await db.query(
      `update public.${c.table} t set ${sets.join(", ")} where t.${c.pk ?? "id"} in (select t.${c.pk ?? "id"} from ${c.from} where ${where}) returning ${c.idExpr} as "_id"`,
      params
    );
    if (rows.length) {
      const item = await getItem(db, c, rows[0]._id);
      return json({ dataItem: { id: rows[0]._id, data: item } });
    }
  } catch (err: any) {
    // A rule in the database said no (e.g. credits below zero).
    if (err?.code === "23514") return json({ message: "Update condition not met", code: "WDE0193" }, 428);
    throw err;
  }
  const exists = await getItem(db, c, id);
  return exists ? json({ message: "Update condition not met", code: "WDE0193" }, 428) : json({ message: "not found" }, 404);
}
