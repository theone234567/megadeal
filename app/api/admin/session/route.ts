import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";

/** Cheap "is there an active admin session" check for pages that need to
 *  know before doing anything else — e.g. the business sign-in screen,
 *  which warns rather than letting someone end up signed in as both the
 *  site admin and a business at once. No data, just the one boolean. */
export async function GET(req: NextRequest) {
  return NextResponse.json({ isAdmin: await isAdminRequest(req) });
}
