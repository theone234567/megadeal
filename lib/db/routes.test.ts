import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import { createPgAdminClient } from "./wixShim";
import { loadLiveDeals } from "./publicReads";
import type { Sql } from "./connection";

/**
 * The real API routes a business and an admin use, run end to end on the
 * new database: sign up, save a draft, submit it, get it approved, pause
 * and restart it, count a view, withdraw one for a refund. Only the edges
 * are stubbed: who is signed in (Wix logins haven't moved yet), email,
 * the AI review and search-engine pings. Nothing here reaches Wix.
 */

let pglite: PGlite;
let db: Sql;

const member = { id: "wix-member-1", email: "owner@harbourbistro.co.nz", loginEmailVerified: true, nickname: null };
let signedIn: typeof member | null = member;
let admin = false;
let aiReview: Record<string, unknown> | null = null;

vi.mock("@/lib/memberAuth", () => ({ getVerifiedMember: async () => signedIn }));
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/dataClient", () => ({ createDataClient: () => createPgAdminClient((fn) => fn(db)) }));
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async () => ({ ok: true }) }));
vi.mock("@/lib/metaCapi", () => ({ sendMetaCapiEvent: async () => {} }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {}, auditTarget: (n: unknown) => String(n) }));
vi.mock("@/lib/indexNowDeal", () => ({ notifyDealChanged: () => {}, notifyBusinessChanged: () => {} }));
// As after launch: before it, submissions are refused (drafts only).
vi.mock("@/lib/siteConfig", async (orig) => ({ ...(await orig<typeof import("../siteConfig")>()), SITE_LAUNCHED: true }));
vi.mock("@/lib/aiReview", async (orig) => ({ ...(await orig<typeof import("../aiReview")>()), reviewWithAi: async () => aiReview }));

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});
beforeEach(async () => {
  await pglite.exec("delete from public.merchant_activity; delete from public.deals; delete from public.merchants; delete from public.email_signups;");
  signedIn = member;
  admin = false;
  aiReview = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function request(method: string, body?: unknown) {
  return new NextRequest("https://megadeal.co.nz/api/test", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function call(handler: (...a: any[]) => Promise<Response>, ...args: any[]) {
  const res = await handler(...args);
  return { status: res.status, body: await res.json() };
}

const SIGNUP = {
  businessName: "Harbour Bistro",
  contactName: "Sam",
  contactPhone: "021 123 4567",
  legalBusinessName: "Harbour Bistro Limited",
  nzbn: "9429000000001",
  phone: "09 123 4567",
  address: "1 Quay Street, Auckland CBD, Auckland 1010",
  city: "Auckland",
  suburb: "Auckland CBD",
  category: "Food & Drink",
  website: "harbourbistro.co.nz",
  bookingEmail: "book@harbourbistro.co.nz",
  priceRange: "$$",
  amenities: "Outdoor seating",
  agreedToTerms: true,
};

const DEAL = {
  dealName: "Two-course dinner",
  description: "Any main and dessert.",
  terms: "Dine-in only.",
  priceNow: 49,
  priceWas: 80,
  isFlash: false,
  durationDays: 14,
  bookingRequirement: "recommended",
  category: "Food & Drink",
  photoUrl: "https://static.wixstatic.com/media/deal.jpg",
  photoMediaId: "m1",
};

async function signUpApprovedWithCredits(credits = 10) {
  const apply = await import("@/app/api/merchants/apply/route");
  const res = await call(apply.POST, request("POST", SIGNUP));
  expect(res.status).toBe(200);
  await db.query("update public.merchants set status = 'Approved', credits_balance = $1", [credits]);
  return res.body.item;
}

describe("a business on the new database", () => {
  it("signs up: the application is saved, linked to their login, with a tidy link", async () => {
    const item = await signUpApprovedWithCredits();
    expect(item).toMatchObject({ businessName: "Harbour Bistro", status: "Pending", _owner: "wix-member-1", category: "Food & Drink" });
    const [row] = await db.query("select website, email, nzbn, referral_code from public.merchants");
    expect(row).toMatchObject({ website: "https://harbourbistro.co.nz", email: "owner@harbourbistro.co.nz", nzbn: "9429000000001" });
    expect(row.referral_code).toMatch(/^MD/);
    // The sign-up also joined the business mailing list.
    await vi.waitFor(async () => expect(await db.query("select audience, verified from public.email_signups")).toEqual([{ audience: "merchant", verified: true }]));
  });

  it("opens the portal (who am I)", async () => {
    await signUpApprovedWithCredits();
    const me = await import("@/app/api/merchants/me/route");
    const res = await call(me.GET, request("GET"));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain("Harbour Bistro");
  });

  it("saves a draft, submits it (credits taken), and an admin approves it onto the site", async () => {
    await signUpApprovedWithCredits(10);
    const draftRoute = await import("@/app/api/deals/draft/route");
    const saved = await call(draftRoute.POST, request("POST", { draft: { dealName: "Two-course dinner", category: "Food & Drink", priceNow: "49" } }));
    expect(saved.status).toBe(200);
    const draftId = saved.body.item._id;
    expect(saved.body.item).toMatchObject({ status: "Draft", dealName: "Two-course dinner" });

    const create = await import("@/app/api/deals/create/route");
    const submitted = await call(create.POST, request("POST", { ...DEAL, draftId }));
    expect(submitted.status).toBe(200);
    expect(submitted.body).toMatchObject({ outcome: "pending" });
    expect(submitted.body.item).toMatchObject({ _id: draftId, status: "Pending Approval", productId: draftId, category: "Food & Drink" });
    const [m] = await db.query("select credits_balance from public.merchants");
    expect(m.credits_balance).toBeLessThan(10);
    const charged = 10 - m.credits_balance;
    expect(await db.query("select type, amount from public.merchant_activity")).toEqual([{ type: "credit", amount: -charged }]);

    // Not on the site until approved.
    expect(await loadLiveDeals(db)).toEqual([]);

    admin = true;
    const adminDeal = await import("@/app/api/admin/deals/[id]/route");
    const approved = await call(adminDeal.PATCH, request("PATCH", { status: "Live" }), params(draftId));
    expect(approved.status).toBe(200);
    const live = await loadLiveDeals(db);
    expect(live.map((d) => ({ slug: d.slug, name: d.name, now: d.now, business: d.businessName }))).toEqual([
      { slug: "two-course-dinner-harbour-bistro-auckland-cbd", name: "Two-course dinner", now: 49, business: "Harbour Bistro" },
    ]);
    expect(live[0].expiresAt).not.toBeNull();
  });

  it("can't submit a deal it can't pay for, and isn't charged", async () => {
    await signUpApprovedWithCredits(0);
    const create = await import("@/app/api/deals/create/route");
    const res = await call(create.POST, request("POST", DEAL));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await db.query("select count(*)::int as n from public.deals where status <> 'Draft'")).toEqual([{ n: 0 }]);
  });

  it("pauses and restarts its own deal, but not one MegaDeal paused", async () => {
    await signUpApprovedWithCredits(10);
    const create = await import("@/app/api/deals/create/route");
    const { body } = await call(create.POST, request("POST", DEAL));
    const id = body.item._id;
    admin = true;
    const adminDeal = await import("@/app/api/admin/deals/[id]/route");
    expect((await call(adminDeal.PATCH, request("PATCH", { status: "Live" }), params(id))).status).toBe(200);
    admin = false;

    const status = await import("@/app/api/deals/[id]/status/route");
    expect((await call(status.POST, request("POST", { status: "Paused" }), params(id))).body.item).toMatchObject({ status: "Paused", pausedBy: "business" });
    expect((await call(status.POST, request("POST", { status: "Live" }), params(id))).body.item.status).toBe("Live");

    admin = true;
    expect((await call(adminDeal.PATCH, request("PATCH", { status: "Paused", note: "Photo needs changing" }), params(id))).status).toBe(200);
    admin = false;
    const refused = await call(status.POST, request("POST", { status: "Live" }), params(id));
    expect(refused.status).toBe(403);
    const [row] = await db.query("select status, paused_by from public.deals");
    expect(row).toEqual({ status: "Paused", paused_by: "admin" });
  });

  it("another business can't touch it", async () => {
    await signUpApprovedWithCredits(10);
    const create = await import("@/app/api/deals/create/route");
    const { body } = await call(create.POST, request("POST", DEAL));
    signedIn = { ...member, id: "wix-member-2", email: "someone@else.nz" };
    const status = await import("@/app/api/deals/[id]/status/route");
    expect((await call(status.POST, request("POST", { status: "Cancelled" }), params(body.item._id))).status).toBe(403);
  });

  it("withdraws a deal waiting for approval and gets the credits back", async () => {
    await signUpApprovedWithCredits(10);
    const create = await import("@/app/api/deals/create/route");
    const { body } = await call(create.POST, request("POST", DEAL));
    const status = await import("@/app/api/deals/[id]/status/route");
    const res = await call(status.POST, request("POST", { status: "Cancelled" }), params(body.item._id));
    expect(res.body).toMatchObject({ creditRefunded: true });
    expect(await db.query("select credits_balance from public.merchants")).toEqual([{ credits_balance: 10 }]);
    // Twice is still one refund.
    await call(status.POST, request("POST", { status: "Cancelled" }), params(body.item._id));
    expect(await db.query("select credits_balance from public.merchants")).toEqual([{ credits_balance: 10 }]);
  });

  it("counts a customer's view of a live deal, and lists the business's deals and activity", async () => {
    await signUpApprovedWithCredits(10);
    const create = await import("@/app/api/deals/create/route");
    const { body } = await call(create.POST, request("POST", DEAL));
    admin = true;
    const adminDeal = await import("@/app/api/admin/deals/[id]/route");
    await call(adminDeal.PATCH, request("PATCH", { status: "Live" }), params(body.item._id));
    admin = false;

    const track = await import("@/app/api/deals/track/route");
    await call(track.POST, request("POST", { productId: body.item.productId, event: "view" }));
    await call(track.POST, request("POST", { productId: body.item.productId, event: "copy", firstInterest: true }));
    expect(await db.query("select view_count, click_count, code_copy_count from public.deals")).toEqual([{ view_count: 1, click_count: 1, code_copy_count: 1 }]);

    const mine = await import("@/app/api/deals/mine/route");
    const deals = await call(mine.GET, request("GET"));
    expect(JSON.stringify(deals.body)).toContain("Two-course dinner");
    const activity = await import("@/app/api/merchants/activity/route");
    const feed = await call(activity.GET, request("GET"));
    expect(JSON.stringify(feed.body)).toContain("submitted");
  });
});

describe("admin work and the rest of the business portal", () => {
  async function liveDeal() {
    const create = await import("@/app/api/deals/create/route");
    const { body } = await call(create.POST, request("POST", DEAL));
    admin = true;
    const adminDeal = await import("@/app/api/admin/deals/[id]/route");
    expect((await call(adminDeal.PATCH, request("PATCH", { status: "Live" }), params(body.item._id))).status).toBe(200);
    admin = false;
    return body.item;
  }

  it("approving a new business gives it its welcome credits once; an admin top-up needs a reason", async () => {
    const apply = await import("@/app/api/merchants/apply/route");
    const { body } = await call(apply.POST, request("POST", SIGNUP));
    admin = true;
    const route = await import("@/app/api/admin/merchants/[id]/route");
    const approved = await call(route.PATCH, request("PATCH", { status: "Approved" }), params(body.item._id));
    expect(approved.status).toBe(200);
    const [{ credits_balance: welcome }] = await db.query("select credits_balance from public.merchants");
    expect(welcome).toBeGreaterThan(0);

    expect((await call(route.PATCH, request("PATCH", { creditsBalance: welcome + 5 }), params(body.item._id))).status).toBe(400);
    expect((await call(route.PATCH, request("PATCH", { creditsBalance: welcome + 5, creditsReason: "Launch thank-you" }), params(body.item._id))).status).toBe(200);
    expect(await db.query("select credits_balance from public.merchants")).toEqual([{ credits_balance: welcome + 5 }]);
    expect(await db.query("select amount, description from public.merchant_activity where description like 'Credits adjusted%'")).toEqual([
      { amount: 5, description: "Credits adjusted by MegaDeal: Launch thank-you" },
    ]);
  });

  it("a referral pays both businesses once, and records who referred", async () => {
    const apply = await import("@/app/api/merchants/apply/route");
    const first = (await call(apply.POST, request("POST", SIGNUP))).body.item;
    admin = true;
    const route = await import("@/app/api/admin/merchants/[id]/route");
    await call(route.PATCH, request("PATCH", { status: "Approved" }), params(first._id));
    const [{ credits_balance: before }] = await db.query("select credits_balance from public.merchants");

    admin = false;
    signedIn = { ...member, id: "wix-member-2", email: "new@cafe.nz" };
    const second = (await call(apply.POST, request("POST", { ...SIGNUP, businessName: "New Cafe", nzbn: "9429000000002", referredByCode: first.referralCode }))).body.item;
    admin = true;
    await call(route.PATCH, request("PATCH", { status: "Approved" }), params(second._id));
    await call(route.PATCH, request("PATCH", { status: "Suspended" }), params(second._id));
    await call(route.PATCH, request("PATCH", { status: "Approved" }), params(second._id));

    const rows = await db.query("select business_name, credits_balance, referral_rewarded, referred_by from public.merchants order by created_at");
    expect(rows[0].credits_balance).toBeGreaterThan(before);
    expect(rows[1]).toMatchObject({ referral_rewarded: true, referred_by: "Harbour Bistro" });
    const [{ credits_balance: after }] = await db.query("select credits_balance from public.merchants where business_name = 'Harbour Bistro'");
    expect(after).toBe(rows[0].credits_balance);
  });

  it("edits the business profile and photos; a name change goes back for review", async () => {
    await signUpApprovedWithCredits();
    const profile = await import("@/app/api/merchants/profile/route");
    const res = await call(profile.POST, request("POST", { ...SIGNUP, bio: "Fresh seafood by the water, with views across the harbour.", businessHours: "Mon–Sun 11am–10pm" }));
    expect(res.body.error ?? null).toBeNull();
    expect(await db.query("select bio, status from public.merchants")).toEqual([{ bio: "Fresh seafood by the water, with views across the harbour.", status: "Approved" }]);
    const renamed = await call(profile.POST, request("POST", { ...SIGNUP, bio: "Fresh seafood by the water, with views across the harbour.", businessName: "Harbour Bistro & Bar" }));
    expect(renamed.status).toBe(200);
    expect(await db.query("select business_name, status from public.merchants")).toEqual([{ business_name: "Harbour Bistro & Bar", status: "Pending" }]);

    const photos = await import("@/app/api/merchants/photos/route");
    expect((await call(photos.POST, request("POST", { photos: ["https://static.wixstatic.com/media/a.jpg"] }))).status).toBe(200);
    expect(await db.query("select photos from public.merchants")).toEqual([{ photos: ["https://static.wixstatic.com/media/a.jpg"] }]);
  });

  it("asks for a change to a live deal, and an admin approves it", async () => {
    await signUpApprovedWithCredits(10);
    const deal = await liveDeal();
    const revision = await import("@/app/api/deals/[id]/revision/route");
    const asked = await call(revision.POST, request("POST", { changes: { terms: "Dine-in only. Not on public holidays." } }), params(deal._id));
    expect(asked.status).toBe(200);
    admin = true;
    const adminDeal = await import("@/app/api/admin/deals/[id]/route");
    expect((await call(adminDeal.PATCH, request("PATCH", { revisionDecision: "approve" }), params(deal._id))).status).toBe(200);
    const [row] = await db.query("select terms, pending_revision, jsonb_array_length(content_history) as history from public.deals");
    expect(row).toEqual({ terms: "Dine-in only. Not on public holidays.", pending_revision: null, history: 1 });
  });

  it("an admin's price edit reaches the deal page", async () => {
    await signUpApprovedWithCredits(10);
    const deal = await liveDeal();
    admin = true;
    const adminDeal = await import("@/app/api/admin/deals/[id]/route");
    expect((await call(adminDeal.PATCH, request("PATCH", { priceNow: 45, dealName: "Two-course dinner for one" }), params(deal._id))).status).toBe(200);
    expect((await loadLiveDeals(db)).map((d) => [d.name, d.now])).toEqual([["Two-course dinner for one", 45]]);
  });

  it("deletes a draft, but not a submitted deal", async () => {
    await signUpApprovedWithCredits(10);
    const draftRoute = await import("@/app/api/deals/draft/route");
    const draft = (await call(draftRoute.POST, request("POST", { draft: { dealName: "Half-written" } }))).body.item;
    const live = await liveDeal();
    const one = await import("@/app/api/deals/[id]/route");
    expect((await call(one.DELETE, request("DELETE"), params(draft._id))).status).toBe(200);
    expect((await call(one.DELETE, request("DELETE"), params(live._id))).status).toBeGreaterThanOrEqual(400);
    expect(await db.query("select status from public.deals")).toEqual([{ status: "Live" }]);
  });

  it("an admin deletes a business with its drafts and activity, but not one with submitted deals", async () => {
    const m = await signUpApprovedWithCredits(10);
    const live = await liveDeal();
    admin = true;
    const route = await import("@/app/api/admin/merchants/[id]/route");
    vi.stubEnv("DATA_BACKEND", "postgres");
    const refused = await call(route.DELETE, request("DELETE"), params(m._id));
    vi.unstubAllEnvs();
    expect(refused.status).toBe(409);
    expect(refused.body.error).toMatch(/Suspend it instead/);
    await db.query("delete from public.deals where id = $1", [live._id]);
    admin = false;
    const draftRoute = await import("@/app/api/deals/draft/route");
    await call(draftRoute.POST, request("POST", { draft: { dealName: "Half-written" } }));
    admin = true;
    const res = await call(route.DELETE, request("DELETE"), params(m._id));
    expect(res.status).toBe(200);
    expect(await db.query("select (select count(*) from public.merchants)::int as m, (select count(*) from public.deals)::int as d, (select count(*) from public.merchant_activity)::int as a")).toEqual([{ m: 0, d: 0, a: 0 }]);
  });

  it("admin lists: businesses, deals, sign-ups; and the site-wide rudeness setting", async () => {
    await signUpApprovedWithCredits(10);
    await liveDeal();
    admin = true;
    for (const path of ["merchants", "deals", "email-signups"]) {
      const route =
        path === "merchants" ? await import("@/app/api/admin/merchants/route") : path === "deals" ? await import("@/app/api/admin/deals/route") : await import("@/app/api/admin/email-signups/route");
      const res = await call(route.GET, request("GET"));
      expect(res.status).toBe(200);
    }
    const settings = await import("@/app/api/admin/settings/route");
    expect((await call(settings.PATCH, request("PATCH", { rudenessCheck: false }))).status).toBe(200);
    expect((await call(settings.GET, request("GET"))).body).toEqual({ rudenessCheck: false });
  });

  it("the contact form saves the message", async () => {
    const contact = await import("@/app/api/contact/route");
    expect((await call(contact.POST, request("POST", { name: "Pat", email: "pat@example.nz", message: "Hello" }))).status).toBe(200);
    expect(await db.query("select name, email, message from public.contact_messages")).toEqual([{ name: "Pat", email: "pat@example.nz", message: "Hello" }]);
  });

  it("launch updates: sign up, confirm by link, unsubscribe by link", async () => {
    const { insertEmailSignup, verifyEmailSignupByToken, unsubscribeEmailSignupByToken } = await import("@/lib/emailSignups");
    const first = await insertEmailSignup({ email: "Fan@Example.nz", audience: "customer", source: "coming-soon", verified: false });
    expect(first?.verifyToken).toMatch(/^[0-9a-f]{64}$/);
    // Signing up again doesn't make a second row.
    const again = await insertEmailSignup({ email: "fan@example.nz", audience: "customer", source: "coming-soon", verified: false });
    expect(await db.query("select count(*)::int as n from public.email_signups")).toEqual([{ n: 1 }]);
    expect(await verifyEmailSignupByToken(first!.verifyToken)).toBe(false); // replaced by the newer link
    expect(await verifyEmailSignupByToken(again!.verifyToken)).toBe(true);
    expect(await verifyEmailSignupByToken(again!.verifyToken)).toBe(false); // works once
    // The link from the first email still works, though a newer one was sent.
    expect(await unsubscribeEmailSignupByToken(first!.unsubscribeToken)).toBe(true);
    expect(await unsubscribeEmailSignupByToken(again!.unsubscribeToken)).toBe(true);
    expect(await db.query("select verified, unsubscribed from public.email_signups")).toEqual([{ verified: true, unsubscribed: true }]);
  });
});

describe("the AI review and housekeeping on the new database", () => {
  const flags = { rude: false, offensive: false, sexual: false, unsafe: false, suspiciousPrice: false, contradictory: false, contactDetailsInText: false, photoProblem: false, sensitiveCategory: false, manipulation: false };
  const review = (verdict: string, extra: Record<string, boolean> = {}) => ({ verdict, flags: { ...flags, ...extra }, reasons: ["test"], messageToBusiness: "Please change the wording.", model: "test", at: new Date().toISOString() });

  it("a clean deal from an approved business goes live straight away", async () => {
    await signUpApprovedWithCredits(10);
    aiReview = review("approve");
    const create = await import("@/app/api/deals/create/route");
    const res = await call(create.POST, request("POST", DEAL));
    expect(res.body.outcome).toBe("live");
    expect((await loadLiveDeals(db)).map((d) => d.slug)).toEqual(["two-course-dinner-harbour-bistro-auckland-cbd"]);
    const [row] = await db.query("select ai_review->>'verdict' as verdict, ever_live, first_published_at is not null as published from public.deals");
    expect(row).toEqual({ verdict: "approve", ever_live: true, published: true });
  });

  it("an offensive deal is turned down with its credits back", async () => {
    await signUpApprovedWithCredits(10);
    aiReview = review("reject", { offensive: true });
    const create = await import("@/app/api/deals/create/route");
    const res = await call(create.POST, request("POST", DEAL));
    expect(res.body.outcome).toBe("rejected");
    expect(res.body.creditsReturned).toBeGreaterThan(0);
    expect(await db.query("select credits_balance from public.merchants")).toEqual([{ credits_balance: 10 }]);
    expect(await db.query("select status from public.deals")).toEqual([{ status: "Cancelled" }]);
  });

  it("a deal withdrawn while the AI was still reviewing it isn't refunded twice when the review turns it down", async () => {
    await signUpApprovedWithCredits(10);
    aiReview = null; // review unavailable: the deal waits for a person
    const create = await import("@/app/api/deals/create/route");
    const { body } = await call(create.POST, request("POST", DEAL));
    const client = createPgAdminClient((fn) => fn(db));
    // What the review started with: the deal as it was, still waiting.
    const stale = (await client.items.get("Deals", body.item._id))!;
    const [merchant] = (await client.items.query("Merchants").find()).items;
    expect(stale.status).toBe("Pending Approval");

    // Meanwhile the business withdraws it and gets its credits back.
    const status = await import("@/app/api/deals/[id]/status/route");
    await call(status.POST, request("POST", { status: "Cancelled" }), params(body.item._id));
    expect(await db.query("select credits_balance from public.merchants")).toEqual([{ credits_balance: 10 }]);

    // Then the review comes back: turned down.
    aiReview = review("reject", { offensive: true });
    const { reviewSubmittedDeal } = await import("@/lib/aiReviewApply");
    const result = await reviewSubmittedDeal(client, stale, merchant, { apply: true });
    expect(result.creditsReturned ?? 0).toBe(0);
    expect(await db.query("select credits_balance from public.merchants")).toEqual([{ credits_balance: 10 }]);
    expect(await db.query("select status, credit_refunded from public.deals")).toEqual([{ status: "Cancelled", credit_refunded: true }]);
  });

  it("a review that fails leaves the deal as it was, waiting for a person", async () => {
    await signUpApprovedWithCredits(10);
    const create = await import("@/app/api/deals/create/route");
    const { body } = await call(create.POST, request("POST", DEAL));
    const client = createPgAdminClient((fn) => fn(db));
    const deal = (await client.items.get("Deals", body.item._id))!;
    const [merchant] = (await client.items.query("Merchants").find()).items;
    aiReview = null;
    const { reviewSubmittedDeal } = await import("@/lib/aiReviewApply");
    const result = await reviewSubmittedDeal(client, deal, merchant, { apply: true });
    expect(result.outcome).toBe("hold");
    expect(await db.query("select status from public.deals")).toEqual([{ status: "Pending Approval" }]);
  });

  it("the hourly job finds deals that have just ended", async () => {
    await signUpApprovedWithCredits(10);
    aiReview = review("approve");
    const create = await import("@/app/api/deals/create/route");
    await call(create.POST, request("POST", DEAL));
    await db.query("update public.deals set expires_at = now() - interval '10 minutes'");
    process.env.CRON_SECRET = "test-secret";
    const cron = await import("@/app/api/cron/expired-deals/route");
    const req = new NextRequest("https://megadeal.co.nz/api/cron/expired-deals", { method: "POST", headers: { authorization: "Bearer test-secret" } });
    const res = await call(cron.POST, req);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("error");
    delete process.env.CRON_SECRET;
  });
});
