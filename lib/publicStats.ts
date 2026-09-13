import { createWixAdminClient } from "@/lib/wixAdmin";
import { queryAllItems } from "@/lib/queryAll";

export interface SignupStats {
  merchantCount: number;
  waitlistCount: number;
}

/**
 * Real counts for /list-your-business' cold-start trust signal — how many
 * businesses have actually been approved, and how many customers are
 * already on the launch waitlist. Both collections are admin-only in Wix
 * (a merchant's own SITE_MEMBER_AUTHOR token can't read across other
 * members' rows), so this always goes through the admin client. Returns
 * null on any failure (including the admin credentials being unset, as in
 * local/dev sandboxes) so the caller can hide the section entirely rather
 * than show a broken or misleadingly-zero number.
 *
 * merchantCount counts only "Approved" merchants, not "Pending" ones —
 * an application that hasn't been reviewed yet isn't a business you can
 * honestly say has "signed up" to a visitor deciding whether to trust the
 * platform.
 */
export async function getSignupStats(): Promise<SignupStats | null> {
  try {
    const adminClient = createWixAdminClient();
    // Both paged. These two numbers are shown to visitors as counts of
    // real businesses and real subscribers, and an unpaged read caps at
    // Wix's default page of 50 — so past 50 the figures would freeze while
    // still being presented as true, which is the one thing a trust
    // signal must never do.
    const [merchants, signups] = await Promise.all([
      queryAllItems(
        () => adminClient.items.query("Merchants").eq("status", "Approved"),
        "Merchants (stats)"
      ),
      queryAllItems(
        () =>
          adminClient.items
            .query("EmailSignups")
            .eq("audience", "customer")
            .eq("verified", true),
        "EmailSignups (stats)"
      ),
    ]);

    const merchantCount = merchants.length;
    // unsubscribed is only ever explicitly set true on opt-out — filtering
    // in JS (rather than .eq("unsubscribed", false) in the query) avoids
    // excluding rows where it was never set at all.
    const waitlistCount = signups.filter((i: any) => !i.unsubscribed).length;

    return { merchantCount, waitlistCount };
  } catch (err) {
    console.error("[publicStats] getSignupStats failed", err);
    return null;
  }
}
