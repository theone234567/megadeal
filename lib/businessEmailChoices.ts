import "server-only";
import { queryAllByEmail } from "./queryAll";
import { optedOutBusinesses } from "./businessEmailOptOut";

type DataClient = { items: { query: (collection: string) => any } };

/**
 * A business's own email choices, as the portal shows them (Emails from
 * MegaDeal) and admin sees them:
 *  - news: on the business news and tips list (EmailSignups, audience
 *    "merchant"), confirmed and not unsubscribed;
 *  - announcements: announcements to businesses and "finish your listing"
 *    reminders not switched off (lib/businessEmailOptOut.ts).
 * Account and deal emails aren't a choice, so they aren't here.
 */
export async function businessNewsRows(client: DataClient, email: string): Promise<any[]> {
  const rows = await queryAllByEmail((e: string) => client.items.query("EmailSignups").eq("email", e), email, "EmailSignups (preferences)");
  return rows.filter((r: any) => r.audience === "merchant");
}

export async function businessEmailChoices(
  client: DataClient,
  merchant: { _id: string; email: string },
): Promise<{ news: boolean; announcements: boolean }> {
  const rows = await businessNewsRows(client, merchant.email);
  const news = rows.some((r) => r.verified === true) && !rows.some((r) => r.unsubscribed === true);
  const announcements = !(await optedOutBusinesses([merchant._id])).has(merchant._id);
  return { news, announcements };
}
