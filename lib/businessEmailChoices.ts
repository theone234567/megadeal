import "server-only";
import { queryAllByEmail } from "./queryAll";
import { optInBusiness, optOutBusiness, optedOutBusinesses } from "./businessEmailOptOut";

type DataClient = { items: { query: (collection: string) => any; get?: (c: string, id: string) => Promise<any>; update: (c: string, item: any) => Promise<any> } };

/**
 * A business's one email choice (owner's decision, 25 Oct 2026): News and
 * updates from MegaDeal, on or off. On means business news and tips,
 * announcements and "finish your listing" reminders; off stops all of
 * them. A new business is subscribed (the Terms say so, with how to stop);
 * the portal switch, the unsubscribe link in any of these emails and the
 * business news list's own unsubscribe all set the same choice. Emails
 * about the account and deals aren't a choice, so they aren't here.
 *
 * Kept in two places for the senders that read them: the per-business
 * opt-out (lib/businessEmailOptOut.ts: announcements to businesses and
 * reminders) and, if the address is on it, the business news list
 * (EmailSignups, audience "merchant"). Either one off reads as off.
 */
export async function businessNewsRows(client: DataClient, email: string): Promise<any[]> {
  const rows = await queryAllByEmail((e: string) => client.items.query("EmailSignups").eq("email", e), email, "EmailSignups (preferences)");
  return rows.filter((r: any) => r.audience === "merchant");
}

export async function businessEmailsOn(client: DataClient, merchant: { _id: string; email: string }): Promise<boolean> {
  const rows = await businessNewsRows(client, merchant.email);
  if (rows.some((r) => r.unsubscribed === true)) return false;
  return !(await optedOutBusinesses([merchant._id])).has(merchant._id);
}

/** Sets the choice in both places. False if it couldn't be saved. */
export async function setBusinessEmails(client: DataClient, merchant: { _id: string; email: string }, on: boolean): Promise<boolean> {
  const saved = on ? await optInBusiness(merchant._id) : await optOutBusiness(merchant._id);
  if (!saved) return false;
  for (const row of merchant.email ? await businessNewsRows(client, merchant.email) : []) {
    if (on && (row.unsubscribed || row.verified !== true)) await client.items.update("EmailSignups", { ...row, unsubscribed: false, verified: true });
    if (!on && !row.unsubscribed) await client.items.update("EmailSignups", { ...row, unsubscribed: true });
  }
  return true;
}
