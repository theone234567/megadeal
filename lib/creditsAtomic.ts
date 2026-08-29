import "server-only";

/**
 * Atomic server-side increment of a Merchants record's creditsBalance —
 * safe under concurrent writers (e.g. a referral bonus landing at the same
 * moment as a deal-credit debit), unlike a get-then-update in application
 * code which can lose an update if two requests read the same starting
 * balance. Pass a negative amount to debit.
 */
export async function incrementCreditsAtomically(
  adminClient: any,
  merchantId: string,
  amount: number
): Promise<boolean> {
  try {
    const res = await adminClient.fetchWithAuth(
      `https://www.wixapis.com/wix-data/v2/items/${merchantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataCollectionId: "Merchants",
          patch: {
            dataItemId: merchantId,
            fieldModifications: [
              { fieldPath: "creditsBalance", action: "INCREMENT_FIELD", incrementFieldOptions: { value: amount } },
            ],
          },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
