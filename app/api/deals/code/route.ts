import { NextRequest, NextResponse } from "next/server";
import { withDb } from "@/lib/db/connection";
import { readDealBySlug } from "@/lib/db/publicReads";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isAdminRequest } from "@/lib/adminSession";
import { readSmallJson } from "@/lib/readJsonBody";
import { DEALS_OPEN, SITE_LAUNCHED } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * A live deal's code, asked for when a customer presses "Get deal code"
 * (SEO pack T208). The code isn't in the deal page's HTML or data, so a
 * scraper reading pages gets no codes, and the reveal counts a business
 * sees are real presses. Refused for a deal that isn't live right now
 * (paused, cancelled, ended, sold out): a page left open can't hand it
 * out. Never cached anywhere, and limited per visitor.
 *
 * Before launch the deal pages are admin-only (middleware.ts), and so is
 * this.
 */
const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
const PER_IP = 40;
const WINDOW_SECONDS = 10 * 60;

export async function POST(req: NextRequest) {
  const body = await readSmallJson(req, 1024);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: HEADERS });
  }
  if (!SITE_LAUNCHED && !DEALS_OPEN && !(await isAdminRequest(req))) {
    return NextResponse.json({ error: "This deal isn't available right now." }, { status: 404, headers: HEADERS });
  }
  if ((await checkRateLimit(`deal-code-ip:${getClientIp(req)}`, PER_IP, WINDOW_SECONDS)).limited) {
    return NextResponse.json({ error: "Too many codes asked for just now. Please wait a few minutes." }, { status: 429, headers: HEADERS });
  }
  try {
    const read = await withDb((db) => readDealBySlug(db, slug));
    if (!read) return NextResponse.json({ error: "This deal isn't available right now." }, { status: 404, headers: HEADERS });
    if (!read.live || !read.deal.inStock) {
      return NextResponse.json({ error: "This deal isn't available right now." }, { status: 409, headers: HEADERS });
    }
    return NextResponse.json({ code: read.deal.dealCode ?? null }, { headers: HEADERS });
  } catch (err) {
    console.error("[deals/code] failed", err);
    return NextResponse.json({ error: "We couldn't get the code just now. Please try again." }, { status: 502, headers: HEADERS });
  }
}
