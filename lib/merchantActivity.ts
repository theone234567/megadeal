import "server-only";

export type MerchantActivityType = "credit" | "deal";

/**
 * Logs one entry to the MerchantActivity collection — the merchant-facing
 * credit ledger and activity feed shown in the portal. Deliberately
 * non-fatal: a logging failure should never break the action that
 * triggered it (granting credits, approving a deal, etc.), so callers
 * don't need to wrap this in their own try/catch.
 */
export async function logMerchantActivity(
  adminClient: any,
  entry: { merchantEmail: string; type: MerchantActivityType; amount?: number; description: string }
): Promise<void> {
  if (!entry.merchantEmail) return;
  try {
    await adminClient.items.insert("MerchantActivity", {
      merchantEmail: entry.merchantEmail,
      type: entry.type,
      amount: entry.amount ?? null,
      description: entry.description,
    });
  } catch (err) {
    console.error("[merchantActivity] log failed", err);
  }
}
