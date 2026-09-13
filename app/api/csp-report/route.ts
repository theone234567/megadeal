import { NextRequest, NextResponse } from "next/server";

/**
 * Collects Content-Security-Policy violation reports.
 *
 * The CSP in next.config.mjs ships in Report-Only mode, which is only
 * useful if something is listening — this is that listener. Once real
 * traffic has run through it for a few days with nothing but noise
 * arriving, the policy can be switched to enforcing (CSP_ENFORCE=1).
 *
 * Reports are posted by browsers with no credentials and no CSRF token,
 * from any page load, so this endpoint is unauthenticated by necessity.
 * That makes it trivially spammable, hence the hard size cap and the fact
 * that nothing here is persisted or trusted: it logs, and that is all.
 * Everything in the payload is attacker-controllable and is treated as
 * untrusted text.
 */

// NOT `export const runtime = "edge"`. OpenNext cannot bundle an edge
// runtime route into the Cloudflare Worker — it fails the whole build with
// "cannot use the edge runtime … must be defined in a separate function" —
// and this was the only route in the app that declared it. Every deploy
// after it was added failed, so four commits of fixes silently never
// reached production while the live site kept serving an older build and
// looking like the bugs were unfixed.
//
// It bought nothing anyway: the Worker already runs at the edge, so the
// default runtime is both correct and faster to reason about here.

/** Reports are small. Anything larger is not a real one. */
const MAX_BYTES = 16 * 1024;

/** Keeps one noisy browser or a spam script from filling the log. */
const MAX_REPORTS_PER_MINUTE = 30;
let windowStart = 0;
let windowCount = 0;

function truncate(value: unknown, max = 300): string {
  if (typeof value !== "string") return "";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export async function POST(request: NextRequest) {
  // 204 regardless of outcome: a browser has nothing useful to do with an
  // error here, and telling a prober what we rejected serves no one.
  const noContent = new NextResponse(null, { status: 204 });

  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (++windowCount > MAX_REPORTS_PER_MINUTE) return noContent;

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return noContent;

  try {
    const body = await request.text();
    if (body.length > MAX_BYTES) return noContent;

    const parsed = JSON.parse(body) as {
      "csp-report"?: Record<string, unknown>;
    };
    const report = parsed["csp-report"] ?? (parsed as Record<string, unknown>);

    // Only the fields worth acting on, each truncated. The full payload is
    // deliberately not logged — it includes the originating URL, which can
    // carry query strings a visitor typed.
    console.warn("[csp]", {
      directive: truncate(report["violated-directive"] ?? report["effectiveDirective"], 80),
      blocked: truncate(report["blocked-uri"] ?? report["blockedURL"], 200),
      document: truncate(report["document-uri"] ?? report["documentURL"], 200),
    });
  } catch {
    // Malformed report — nothing to do.
  }

  return noContent;
}

/** Nothing to see here; the endpoint exists only to receive reports. */
export async function GET() {
  return new NextResponse(null, { status: 405 });
}
