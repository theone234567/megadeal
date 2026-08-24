import type { VerifiedMember } from "./memberAuth";

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
  if (ownedRecord) return ownedRecord;

  if (!member.email) return null;

  const candidates = await adminClient.items
    .query("Merchants")
    .eq("email", member.email.toLowerCase())
    .find();
  const match = (candidates.items ?? []).find((m: any) => !m._owner);
  if (!match) return null;

  return adminClient.items.update("Merchants", { ...match, _owner: member.id });
}
