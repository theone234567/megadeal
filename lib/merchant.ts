import type { VerifiedMember } from "./memberAuth";
import { queryAllByEmail } from "./queryAll";

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

  // Raw, not lower-cased. Every other writer — the apply route, deal
  // creation, the activity log — stores the address exactly as Wix gives
  // it, and Wix Data's eq() is case-sensitive, so lower-casing only here
  // split Merchants.email away from every column that joins to it.
  const email = member.email;
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

  // Claiming is the one privilege escalation in this codebase: it hands a
  // member an existing business — its credits, its deals, its contact
  // details, and the ability to publish under its name — on the strength
  // of an email address alone. Every merchant API route resolves the
  // caller's business through here, so this single check is what stands
  // between "signed in" and "signed in as that business".
  //
  // An unverified email is not proof of anything: it is a string typed
  // into a signup form. Wix's own flow does demand a mailed code before
  // issuing member tokens, which is why this was not exploitable, but
  // that is a setting in the Wix dashboard rather than anything this code
  // controls — and a claim is irreversible once _owner is written. The
  // flag is free now that getCurrentMember asks for the FULL fieldset,
  // so require it explicitly rather than inheriting the guarantee.
  if (!member.loginEmailVerified) return null;

  // Both casings: rows written before the write side was made consistent
  // may carry either, and a claim that misses leaves a merchant staring at
  // "finish your signup" over a business they already have.
  const candidates = await queryAllByEmail(
    (email) => adminClient.items.query("Merchants").eq("email", email),
    member.email,
    "Merchants (claim)"
  );
  const match = candidates.find((m: any) => !m._owner);
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
