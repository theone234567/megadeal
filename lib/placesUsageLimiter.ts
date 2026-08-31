import { createWixAdminClient } from "@/lib/wixAdmin";

const DAILY_LIMIT = 200;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Site-wide daily circuit breaker for the Google Places proxy routes.
 * Server-only — never import this from a "use client" component. Backed by
 * a single "ApiUsageCounters" Wix Data row per day, following the same
 * best-effort read-then-write pattern as the deal view/click counters
 * (app/api/deals/track/route.ts): the read-then-write here isn't atomic, so
 * concurrent requests can occasionally over/undercount by one or two — an
 * acceptable tradeoff for a safety cap, not something billing math depends
 * on being exact. Fails closed: any error talking to Wix Data is treated as
 * "over quota" so a real backend issue never accidentally opens the tap.
 */
export async function tryConsumePlacesQuota(): Promise<boolean> {
  try {
    const adminClient = createWixAdminClient();
    const date = todayKey();
    const result = await adminClient.items.query("ApiUsageCounters").eq("date", date).find();
    const record = result.items?.[0];
    const count = Number(record?.count) || 0;

    if (count >= DAILY_LIMIT) return false;

    if (record) {
      await adminClient.items.update("ApiUsageCounters", { ...record, count: count + 1 });
    } else {
      await adminClient.items.insert("ApiUsageCounters", { date, count: 1 });
    }
    return true;
  } catch (err) {
    console.error("[placesUsageLimiter] quota check failed, failing closed", err);
    return false;
  }
}
