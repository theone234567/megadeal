import type { VerifiedMember } from "./memberAuth";

/**
 * Brings a Merchants record's copy of the member's email details back in
 * line with the member itself, writing only when something actually
 * differs so a portal load stays a read in the normal case.
 *
 * These two fields are snapshots — written at application time and never
 * refreshed — which is fine only while the snapshot is right. It wasn't:
 * getCurrentMember was called without the FULL fieldset, so loginEmail and
 * loginEmailVerified came back undefined and were stored as "" and false
 * on merchants who had verified their email perfectly well. That left the
 * admin dashboard showing "No email on file" and "Email pending
 * verification" against good accounts, with no way for the merchant to
 * correct it. Fixing the fieldset stops new records being written wrong;
 * this repairs the ones that already are, the next time the merchant opens
 * their portal.
 *
 * An empty member email never overwrites a stored one — a blank is the
 * failure mode we're recovering from, so it is never the better value.
 */
async function syncMemberFields(adminClient: any, record: any, member: VerifiedMember) {
  const patch: Record<string, any> = {};

  const email = member.email?.toLowerCase();
  if (email && record.email !== email) patch.email = email;
  if (record.emailVerified !== member.loginEmailVerified) {
    patch.emailVerified = member.loginEmailVerified;
  }

  if (Object.keys(patch).length === 0) return record;

  try {
    return await adminClient.items.update("Merchants", { ...record, ...patch });
  } catch (err) {
    // A failed repair must not cost the merchant their portal — they'd be
    // shown "finish your signup" over a business they already have.
    console.error("[merchant] failed to refresh member fields", err);
    return record;
  }
}

/**
 * Finds the calling member's Merchants record. A business can apply without
 * signing in first (see /api/merchants/apply), so the record they created
 * has no `_owner` yet — the first time the same person signs in with a
 * matching email, this claims that record for their account by setting
 * `_owner`, so it starts showing up under their portal from then on exactly
 * like any other member-owned item.
 */
export async function getOrClaimMerchant(adminClient: any, member: VerifiedMember): Promise<any | null> {
  const owned = await adminClient.items.query("Merchants").eq("_owner", member.id).find();
  const ownedRecord = owned.items?.[0];
  if (ownedRecord) return syncMemberFields(adminClient, ownedRecord, member);

  if (!member.email) return null;

  const candidates = await adminClient.items
    .query("Merchants")
    .eq("email", member.email.toLowerCase())
    .find();
  const match = (candidates.items ?? []).find((m: any) => !m._owner);
  if (!match) return null;

  return adminClient.items.update("Merchants", {
    ...match,
    _owner: member.id,
    // Claiming is the one moment we know for certain who this record
    // belongs to, so it's also the right moment to correct what it says
    // about them rather than leaving a stale snapshot behind.
    emailVerified: member.loginEmailVerified,
  });
}
