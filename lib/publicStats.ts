import { createWixAdminClient } from "@/lib/wixAdmin";

export interface SignupStats {
  merchantCount: number;
  waitlistCount: number;
}

/**
 * Real counts for /businesses' cold-start trust signal — how many
 * businesses have actually applied, and how many customers are already on
 * the launch waitlist. Both collections are admin-only in Wix (a merchant's
 * own SITE_MEMBER_AUTHOR token can't read across other members' rows), so
 * this always goes through the admin client. Returns null on any failure
 * (including the admin credentials being unset, as in local/dev sandboxes)
 * so the caller can hide the section entirely rather than show a broken or
 * misleadingly-zero number.
 */
export async function getSignupStats(): Promise<SignupStats | null> {
  try {
    const adminClient = createWixAdminClient();
    const [merchantsResult, signupsResult] = await Promise.all([
      adminClient.items.query("Merchants").find(),
      adminClient.items.query("EmailSignups").eq("audience", "customer").eq("verified", true).find(),
    ]);

    const merchantCount = merchantsResult.items?.length ?? 0;
    // unsubscribed is only ever explicitly set true on opt-out — filtering
    // in JS (rather than .eq("unsubscribed", false) in the query) avoids
    // excluding rows where it was never set at all.
    const waitlistCount = (signupsResult.items ?? []).filter((i: any) => !i.unsubscribed).length;

    return { merchantCount, waitlistCount };
  } catch (err) {
    console.error("[publicStats] getSignupStats failed", err);
    return null;
  }
}
