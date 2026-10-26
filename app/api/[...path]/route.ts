import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * Any /api address that isn't a real route (T257): a JSON 404, the way
 * every API route answers, rather than the site's HTML "page not found"
 * page, which a script calling the API can't read. Real routes always win
 * over this catch-all.
 */
const notFound = () =>
  NextResponse.json(
    { error: `There's no API at this address. See ${SITE_URL}/developers for the public deals feed.` },
    { status: 404, headers: { "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex" } }
  );

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
