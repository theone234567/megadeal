import { NextResponse } from "next/server";

/**
 * Which build is actually serving this request.
 *
 * Exists because "is the fix live yet?" kept being unanswerable. A page
 * held in the browser's cache and a deploy that never happened look
 * exactly the same from the outside, and each wrong guess sent everyone
 * chasing a bug that had already been fixed — or declaring one fixed that
 * wasn't. Opening this URL settles it in one step, on a phone, with no
 * devtools: compare `sha` against the commit you expect.
 *
 * Deliberately uncached — a cached answer about caching is worthless.
 *
 * Nothing here is sensitive: the repository's commit history is the same
 * information, and a short sha tells an attacker nothing they couldn't get
 * by diffing the public bundle.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      sha: process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown",
      builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown",
      servedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
      },
    }
  );
}
