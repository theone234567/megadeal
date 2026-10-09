import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { fromOwnSite } from "@/lib/authSession";
import { dataBackend, withDb } from "@/lib/db/connection";
import { LAUNCH_TICKS_KEY, SIGNUP_CODE_SENT_KEY } from "@/lib/kvMarkers";
import { buildChecklist, isManualItem, looksLikeTest, type LaunchFacts } from "@/lib/launchChecklist";
import { checkReadiness } from "@/lib/migrationReadiness";
import { nextStep } from "@/lib/moveOffWixNextStep";
import { getRateLimitKv } from "@/lib/rateLimit";
import { signupCodeProblem } from "@/lib/signupHealth";
import { SITE_LAUNCHED, SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

/**
 * Admin > Launch checklist (lib/launchChecklist.ts). GET works out where
 * each item stands; POST { id, done } ticks or unticks one of the items
 * ticked by hand. Reads only, apart from those ticks.
 */
async function readTicks(): Promise<Record<string, string>> {
  try {
    const raw = await (await getRateLimitKv())?.get(LAUNCH_TICKS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function gatherFacts(): Promise<LaunchFacts> {
  const kv = await getRateLimitKv();
  const [readiness, ticks, problem, lastSentAt] = await Promise.all([
    checkReadiness().catch((err) => (console.error("[admin/launch-checklist] readiness failed", err), null)),
    readTicks(),
    signupCodeProblem(),
    kv?.get(SIGNUP_CODE_SENT_KEY).catch(() => null) ?? null,
  ]);
  const backupCheck = readiness?.sections.flatMap((s) => s.checks).find((c) => c.label === "Nightly backup");
  // Once everything's on, nextStep's advice is about ending Wix, not a
  // problem: the checklist counts that as done.
  const next = readiness ? nextStep(readiness) : "";
  const step = next && !next.startsWith("Everything runs off Wix") ? next : null;

  type Row = { id: string; business_name: string | null; email: string | null; status: string; owner_id: string | null };
  let businesses: Row[] = [];
  let counts = { drafts: 0, live: 0, subscribers: 0 };
  if (dataBackend() === "postgres") {
    [businesses, counts] = await withDb(async (db) => {
      const rows = await db.query<Row>("select id::text, business_name, email, status, owner_id::text from public.merchants");
      const [c] = await db.query<{ drafts: number; live: number; subscribers: number }>(
        `select (select count(*) from public.deals where status = 'Draft')::int as drafts,
                (select count(*) from public.deals where status = 'Live' and (expires_at is null or expires_at > now())
                   and (first_published_at is null or first_published_at <= now()))::int as live,
                (select count(*) from public.email_signups where verified and not unsubscribed)::int as subscribers`
      );
      return [rows, c ?? counts];
    });
  }

  return {
    launched: SITE_LAUNCHED,
    offWix: readiness ? { allOn: readiness.sections.every((s) => s.on), problem: step } : null,
    backup: { ok: backupCheck?.state === "ok", detail: backupCheck?.detail ?? "Couldn't check the backups just now." },
    accountEmails: {
      problem: problem ? `The last ${problem.kind ?? "sign-up code"} email couldn't be sent (${problem.code}). The red note in Needs attention says what to check.` : null,
      lastSentAt: lastSentAt || null,
    },
    turnstile: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() && process.env.TURNSTILE_SECRET_KEY?.trim()),
    twoFactor: Boolean(process.env.ADMIN_TOTP_SECRET?.trim()),
    aiReview: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    notifyEmail: Boolean(process.env.ADMIN_NOTIFY_EMAIL?.trim()),
    withoutLogin: businesses.filter((b) => b.status !== "Suspended" && !b.owner_id).length,
    testBusinesses: businesses
      .filter((b) => looksLikeTest(b.business_name ?? "", b.email ?? ""))
      .map((b) => ({ id: b.id, name: b.business_name ?? "", email: b.email ?? "" })),
    approvedBusinesses: businesses.filter((b) => b.status === "Approved").length,
    draftDeals: counts.drafts,
    liveDeals: counts.live,
    verifiedSubscribers: counts.subscribers,
    ticks,
  };
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  try {
    return NextResponse.json({ sections: buildChecklist(await gatherFacts()), checkedAt: new Date().toISOString() }, { headers });
  } catch (err) {
    console.error("[admin/launch-checklist] failed", err);
    return NextResponse.json({ error: "The checklist couldn't load. Please try again." }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  if (!fromOwnSite(req, SITE_URL)) return NextResponse.json({ error: "Use the admin page." }, { status: 403, headers });
  const body = await req.json().catch(() => null);
  if (!isManualItem(body?.id) || typeof body?.done !== "boolean") {
    return NextResponse.json({ error: "Which item?" }, { status: 400, headers });
  }
  const kv = await getRateLimitKv();
  if (!kv) return NextResponse.json({ error: "Ticks can't be saved just now." }, { status: 503, headers });
  const ticks = await readTicks();
  if (body.done) ticks[body.id] = new Date().toISOString();
  else delete ticks[body.id];
  await kv.put(LAUNCH_TICKS_KEY, JSON.stringify(ticks));
  await logAdminAction({ action: body.done ? "Launch checklist: ticked" : "Launch checklist: unticked", target: body.id }).catch(() => {});
  return NextResponse.json({ ok: true, tickedAt: ticks[body.id] ?? null }, { headers });
}
